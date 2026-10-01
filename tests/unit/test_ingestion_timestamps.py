"""Unit tests for the timestamp synchronization primitives (§5)."""

from __future__ import annotations

from services.ingestion.timestamps import JitterSmoother, TimelineClock, clamp_monotonic


def test_timeline_clock_anchors_at_arrival() -> None:
    clock = TimelineClock()
    clock.set_anchor(pts_seconds=1.0, arrival_mono=100.0)
    assert clock.to_capture(1.0) == pytest_approx(100.0)
    assert clock.to_capture(2.0) == pytest_approx(101.0)
    assert clock.to_capture(4.5) == pytest_approx(103.5)


def test_timeline_clock_continues_across_restart() -> None:
    clock = TimelineClock()
    clock.set_anchor(0.0, arrival_mono=50.0)
    first_loop_end = clock.to_capture(2.0)  # 52.0
    clock.on_restart(first_loop_end)
    clock.set_anchor(0.0, arrival_mono=999.0)  # arrival no longer drives the base
    assert clock.to_capture(0.0) == pytest_approx(52.0)
    assert clock.to_capture(1.0) == pytest_approx(53.0)
    assert clock.to_capture(1.0) > first_loop_end


def test_timeline_clock_unanchored_raises() -> None:
    from pytest import raises

    with raises(RuntimeError):
        TimelineClock().to_capture(0.0)


def test_jitter_smoother_converges_after_burst() -> None:
    smoother = JitterSmoother(alpha=0.5)
    values = [10.0, 10.05, 10.03, 10.08, 10.02]
    out = [smoother.update(v) for v in values]
    # First sample is used verbatim; subsequent estimates stay stable.
    assert out[0] == pytest_approx(10.0)
    assert all(o <= v for o, v in zip(out, values))
    # Jittered samples do not jump the estimate around wildly.
    assert max(out) - min(out) < 0.06


def test_jitter_smoother_resets() -> None:
    smoother = JitterSmoother(alpha=0.5)
    smoother.update(10.0)
    smoother.update(10.0)
    smoother.reset()
    assert smoother.update(99.0) == pytest_approx(99.0)


def test_clamp_monotonic() -> None:
    assert clamp_monotonic(5.0, 4.0) > 4.0
    assert clamp_monotonic(3.9, 4.0) > 4.0  # never goes backwards
    assert clamp_monotonic(10.0, 9.0) == 10.0


def pytest_approx(value: float) -> "object":
    from pytest import approx

    return approx(value, abs=1e-6)