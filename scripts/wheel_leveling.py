"""Detects how far a side-profile ((1).jpg) diecast photo's wheel line is off
level. Not wired into server.py yet -- this is the standalone detector used by
scan_wheel_angles.py to survey the existing photo library for crooked shots.

Approach: search the left third and right third of the car's bounding box
independently for one wheel each (rather than pooling every circle found across
the whole car and guessing which pair is real). This is what makes it robust to:
  - drag/funny cars with very different front/rear wheel sizes (each side is
    judged purely on its own -- no cross-side size comparison at all)
  - trucks where a chassis rail or shadow could be mistaken for a second wheel
    on the same side (each half only ever contributes one candidate)

Every detection also carries a confidence signal (see measure_angle), because
this approach is NOT reliable for every casting -- known weak spots are
light-colored/white rims and cars where the wheel and body are both very dark
(the two areas blend in the mask this relies on). Low-confidence results should
be spot-checked visually before being treated as real, not just trusted blind.
"""
import os
import sys
import math

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server as S  # reuse the real pipeline's contour/white-balance helpers


def _best_circle_in_half(gray_roi, min_r, max_r):
    """Find the single most confident wheel-like circle in a region. Returns
    (cx, cy, r, param2_level) -- param2_level records how strict a Hough match
    was needed, so the caller can grade confidence by it (a circle only found
    after relaxing the threshold all the way down is a weaker match)."""
    enhanced = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(gray_roi)
    blurred = cv2.medianBlur(enhanced, 5)

    for param2 in (45, 38, 32, 26):  # stricter first, relax if nothing found
        circles = cv2.HoughCircles(
            blurred, cv2.HOUGH_GRADIENT, dp=1.2, minDist=max(gray_roi.shape),
            param1=80, param2=param2, minRadius=min_r, maxRadius=max_r,
        )
        if circles is None:
            continue
        cx, cy, r = circles[0][0]
        cx, cy, r = int(cx), int(cy), int(r)
        # interior must have real texture (spokes/hub), not a uniform patch
        # (shadow) or a partial arc hallucinated from a straight edge
        y0, y1 = max(0, cy - r), min(gray_roi.shape[0], cy + r)
        x0, x1 = max(0, cx - r), min(gray_roi.shape[1], cx + r)
        patch = gray_roi[y0:y1, x0:x1]
        if patch.size == 0 or patch.std() < 8:
            continue
        return (cx, cy, r, param2)
    return None


def find_wheels(img, car_x, car_y, car_w, car_h):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    roi_y0 = car_y + int(car_h * 0.30)
    roi_y1 = min(gray.shape[0], car_y + car_h + 20)
    min_r = max(6, int(car_h * 0.09))
    max_r = max(min_r + 5, int(car_h * 0.45))  # widened for drag-slick rear tires

    third = car_w // 3
    left_x0, left_x1 = max(0, car_x - 10), car_x + third
    right_x0 = car_x + car_w - third
    right_x1 = min(gray.shape[1], car_x + car_w + 10)

    left = _best_circle_in_half(gray[roi_y0:roi_y1, left_x0:left_x1], min_r, max_r)
    right = _best_circle_in_half(gray[roi_y0:roi_y1, right_x0:right_x1], min_r, max_r)
    if left is None or right is None:
        return None

    lcx, lcy, lr, lp2 = left
    rcx, rcy, rr, rp2 = right
    return (lcx + left_x0, lcy + roi_y0, lr, lp2), (rcx + right_x0, rcy + roi_y0, rr, rp2)


def true_tire_bottom(dark_mask, cx, cy, approx_r):
    """Refine the circle-geometry bottom estimate (cy + r) by scanning the dark
    mask, but distrust the scan if it strays too far from that estimate -- a rim
    highlight can make it stop short, and a tire-colored shadow merging into the
    mask (dark cars especially) can make it run long. Returns (y, was_clamped)."""
    circle_bottom = cy + approx_r
    half_strip = 6
    x0, x1 = max(0, cx - half_strip), min(dark_mask.shape[1], cx + half_strip)
    if x1 <= x0:
        return circle_bottom, True

    col_any = np.any(dark_mask[:, x0:x1] > 0, axis=1)
    search_start = max(0, cy)
    search_end = min(dark_mask.shape[0] - 1, cy + int(approx_r * 2.2))
    last_dark = None
    for yy in range(search_start, search_end):
        if col_any[yy]:
            last_dark = yy
        elif last_dark is not None and yy - last_dark > 8:
            break

    if last_dark is None:
        return circle_bottom, True
    if abs(last_dark - circle_bottom) > approx_r * 0.45:
        return circle_bottom, True  # scan wandered too far to trust
    return last_dark, False


def dark_mask_for(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return thresh


def measure_angle(img):
    """Returns (angle_degrees, reason, debug). reason is None on success, else
    why detection failed and angle/debug are None. debug['confident'] is the
    headline signal -- False means treat the angle as a lead to check, not a
    verdict (see the module docstring for known weak spots)."""
    gray_raw = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred_raw = cv2.GaussianBlur(gray_raw, (7, 7), 0)
    _, car_mask_raw = cv2.threshold(blurred_raw, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    img_wb = S.adjust_exposure_and_wb(img, cv2.bitwise_not(car_mask_raw))

    contour = S.get_car_contour(img_wb)
    if contour is None:
        return None, 'no car contour found', None
    x, y, w, h = cv2.boundingRect(contour)

    res = find_wheels(img_wb, x, y, w, h)
    if res is None:
        return None, 'no wheel pair found', None
    (lcx, lcy, lr, lp2), (rcx, rcy, rr, rp2) = res

    dark_mask = dark_mask_for(img_wb)
    l_bottom_y, l_clamped = true_tire_bottom(dark_mask, lcx, lcy, lr)
    r_bottom_y, r_clamped = true_tire_bottom(dark_mask, rcx, rcy, rr)
    dx = rcx - lcx
    if dx == 0:
        return None, 'degenerate wheel geometry', None
    angle = math.degrees(math.atan2(r_bottom_y - l_bottom_y, dx))

    weakest_param2 = min(lp2, rp2)
    radius_ratio = max(lr, rr) / max(1, min(lr, rr))
    confident = weakest_param2 >= 38 and not l_clamped and not r_clamped

    debug = {
        'left': (lcx, lcy, lr, l_bottom_y), 'right': (rcx, rcy, rr, r_bottom_y),
        'confident': confident, 'weakest_param2': weakest_param2,
        'clamped': (l_clamped, r_clamped), 'radius_ratio': radius_ratio,
    }
    return angle, None, debug
