"""Unit tests for the bounded drop-oldest FrameBuffer."""

from __future__ import annotations

import time

import numpy as np
import pytest

from services.ingestion.buffer import FrameBuffer
from services.ingestion.frame import Frame


def _frame(seq: int) -> Frame:
    return Frame(
        camera_id="cam",
        sequence=seq,
        capture_ts=float(seq),
        received_ts=float(seq) + 0.01,
        data=np.zeros((4, 4, 3), dtype=np.uint8),
    )


def test_drop_oldest_when_full() -> None:
    buf = FrameBuffer(maxlen=3)
    assert buf.put(_frame(1)) is None
    assert buf.put(_frame(2)) is None
    assert buf.put(_frame(3)) is None
    # Fourth put must evict the oldest (seq 1) and return it.
    dropped = buf.put(_frame(4))
    assert dropped is not None and dropped.sequence == 1
    assert buf.qsize() == 3
    oldest = buf.get_nowait()
    assert oldest is not None and oldest.sequence == 2


def test_get_is_fifo_after_drops() -> None:
    buf = FrameBuffer(maxlen=4)
    for seq in range(10):
        buf.put(_frame(seq))
    # Drops kept only the last 4 frames; reads come out in order.
    seqs = []
    while (f := buf.get_nowait()) is not None:
        seqs.append(f.sequence)
    assert seqs == [6, 7, 8, 9]


def test_get_blocks_and_times_out_on_empty() -> None:
    buf = FrameBuffer(maxlen=4)
    assert buf.get(timeout=0.05) is None


def test_get_wakes_on_put() -> None:
    import threading

    buf = FrameBuffer(maxlen=4)
    results: list[Frame | None] = []

    def consume() -> None:
        results.append(buf.get(timeout=2.0))

    thread = threading.Thread(target=consume)
    thread.start()
    time.sleep(0.05)
    buf.put(_frame(42))
    thread.join(timeout=2.0)
    assert not thread.is_alive()
    assert results and results[0] is not None and results[0].sequence == 42


def test_close_unblocks_consumers() -> None:
    import threading

    buf = FrameBuffer(maxlen=4)
    results: list[Frame | None] = []

    def consume() -> None:
        results.append(buf.get(timeout=5.0))

    thread = threading.Thread(target=consume)
    thread.start()
    time.sleep(0.05)
    buf.close()
    thread.join(timeout=2.0)
    assert not thread.is_alive()
    assert results == [None]


def test_rejects_zero_maxlen() -> None:
    with pytest.raises(ValueError):
        FrameBuffer(maxlen=0)


def test_memory_never_grows_beyond_maxlen() -> None:
    buf = FrameBuffer(maxlen=8)
    for _ in range(10_000):
        buf.put(_frame(1))
    assert buf.qsize() == 8