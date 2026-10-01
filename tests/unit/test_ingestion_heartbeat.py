"""Unit tests for the heartbeat reporter (talks to the Phase 3 API over HTTP).

Uses a tiny local HTTP server to capture requests, so no database or real
backend is needed while still exercising the real request path end-to-end.
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import time

from services.ingestion.heartbeat import HeartbeatReporter
from services.ingestion.metrics import PipelineMetrics


class _CaptureHandler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        # ``self.server`` is always the raw ThreadingHTTPServer instance, so the
        # capture list must live on that object (not on a wrapper).
        self.server.requests.append((self.path, json.loads(body)))  # type: ignore[attr-defined]
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')

    def log_message(self, *args) -> None:  # quiet the test log
        pass


class CaptureServer:
    def __init__(self) -> None:
        self.requests: list[tuple[str, dict]] = []
        self._httpd = ThreadingHTTPServer(("127.0.0.1", 0), _CaptureHandler)
        self._httpd.requests = self.requests  # type: ignore[attr-defined]
        self._shutdown = threading.Thread(target=self._httpd.serve_forever, daemon=True)
        self._shutdown.start()
        self.url = f"http://127.0.0.1:{self._httpd.server_port}"

    def close(self) -> None:
        self._httpd.shutdown()
        self._httpd.server_close()


def test_heartbeat_reports_metrics_payload() -> None:
    server = CaptureServer()
    try:
        metrics = PipelineMetrics()
        metrics.observe_capture(1.0)
        metrics.observe_delivery(latency=0.012, sink_processing=0.001, delivered_at=1.012)
        metrics.on_drop()

        reporter = HeartbeatReporter(server.url, "42", metrics, interval_seconds=0.1, timeout_seconds=1.0)
        reporter.start()
        try:
            deadline = time.time() + 5.0
            while not server.requests and time.time() < deadline:
                time.sleep(0.02)
        finally:
            reporter.stop()

        assert server.requests, "a heartbeat request must have been captured"
        path, body = server.requests[0]
        assert path == "/api/v1/cameras/42/heartbeat"
        assert body["status"] in ("ok", "error", "degraded")
        assert isinstance(body["latency_ms"], float) and body["latency_ms"] > 0
        assert body["payload"]["dropped"] == 1
        assert body["payload"]["delivered"] == 1
    finally:
        server.close()


def test_heartbeat_reports_error_when_unhealthy() -> None:
    server = CaptureServer()
    try:
        metrics = PipelineMetrics()
        metrics.mark_unhealthy("stream down after 5 failed reconnect attempts: boom")
        reporter = HeartbeatReporter(server.url, "7", metrics, interval_seconds=0.1, timeout_seconds=1.0)
        reporter.start()
        try:
            deadline = time.time() + 5.0
            while not server.requests and time.time() < deadline:
                time.sleep(0.02)
        finally:
            reporter.stop()

        _, body = server.requests[0]
        assert body["status"] == "error"
        assert body["payload"]["reconnects"] == 0
    finally:
        server.close()


def test_heartbeat_survives_backend_errors() -> None:
    # No server running → connection refused; the thread must keep running and
    # record a last_error instead of crashing.
    metrics = PipelineMetrics()
    reporter = HeartbeatReporter("http://127.0.0.1:9", "99", metrics, interval_seconds=0.05, timeout_seconds=0.2)
    reporter.start()
    time.sleep(0.35)
    reporter.stop()
    assert reporter.last_error is not None