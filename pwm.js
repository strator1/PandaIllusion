function triangle(x, frequency, shift) {
    epsilon = 1e-6;  // Small offset to prevent exact rounding errors
    return 1.0/Math.PI * Math.asin(Math.sin(2.0 * Math.PI * frequency * (x - shift) + epsilon)) + 0.5;
}

function carrier_shifted_scaled(x, frequency, shift, duty_on, duty_off) {
    return (triangle(x, frequency, shift) - duty_off) / (duty_on - duty_off);
}

function pwm(s, x, fc, shift, duty_on, duty_off) {
    return (carrier_shifted_scaled(x, fc, shift, duty_on, duty_off) - s) >= 0 ? 0 : 1;
}

function yshift(y, pc, ratio, angle) {
    //(-(((pc * r) / 2) / tan( (angle / 2) * (pi / 180) )) / pi) * asin(cos( ((2 * pi) / (pc * r)) * y )) + (((pc * r) / 2) / tan( (angle / 2) * (pi / 180) )) / 2

    return (pc * ratio * (Math.PI - 2.0 * Math.asin(Math.cos((2.0 * Math.PI * y) / (pc * ratio))))) / (4.0 * Math.PI * Math.tan((Math.PI * angle) / 360.0));
}
