class ODOG {
    constructor(img_size = [512, 512], spatial_scales = nj.array(nj.arange(-2, 5).tolist().map(v => Math.pow(2.0, v))).multiply(1.5 * (Math.log(2) / 6.0) ** 0.5), orientations = nj.arange(0, 180, 30), pixels_per_degree = 30, weights_slope = 0.1, UNODOG = false) {
        const center_sigmas = this.degrees_to_pixel(nj.array(spatial_scales).multiply(0.125 * Math.sqrt(3.0 / Math.log(2.0))), pixels_per_degree);

        //this.multiscale_filters = nj.empty([orientations.shape[0], spatial_scales.shape[0], img_size[0], Math.floor(img_size[1] / 2.0 + 1.0), 2]);
        this.multiscale_filters = nj.empty([orientations.shape[0], spatial_scales.shape[0], img_size[0], img_size[1], 2]);

        orientations.tolist().forEach((angle, i) => {
            center_sigmas.tolist().forEach((center_sigma, j) => {
                const real = this.difference_of_gaussians((center_sigma, 2.0 * center_sigma), center_sigma, angle, img_size);
                const imag = nj.zeros(real.shape);
                const complex = nj.stack([real, imag], -1);
                const fft = nj.fft(complex);
                for (var l = 0; l < fft.shape[0]; l++) {
                    for (var m = 0; m < fft.shape[1]; m++) {
                        for (var n = 0; n < fft.shape[2]; n++) {
                            this.multiscale_filters.set(i, j, l, m, n, fft.get(l, m, n));
                        }
                    }
                }
            });
        });
 
        this.img_size = img_size;
        this.spatial_scales = spatial_scales;
        this.scale_weights = nj.array(this.spatial_scales.tolist().map(v => 1.0 / v)).pow(weights_slope);
        this.orientations = orientations;
        this.UNODOG = UNODOG;
    }

    degrees_to_pixel(degrees, ppd) {
        return nj.tan(degrees.divide(2.0).divide(180.0 / Math.PI)).divide(Math.tan(0.5 / (180.0 / Math.PI))).multiply(ppd);
    }

    difference_of_gaussians(sigma_y, sigma_x, angle = 0, size) {
        const outer_gaussian = this.gaussian(sigma_y instanceof Array ? sigma_y[1] : sigma_y, sigma_x instanceof Array ? sigma_x[1] : sigma_x, angle instanceof Array ? angle[1] : angle, size);
        const inner_gaussian = this.gaussian(sigma_y instanceof Array ? sigma_y[0] : sigma_y, sigma_x instanceof Array ? sigma_x[0] : sigma_x, angle instanceof Array ? angle[0] : angle, outer_gaussian.shape);

        return nj.subtract(inner_gaussian, outer_gaussian);
    }

    gaussian(sigma_y, sigma_x, angle = 0, size) {
        const theta = angle / (180.0 / Math.PI);
        const R = nj.array(
            [[Math.cos(theta), -Math.sin(theta)],
            [Math.sin(theta), Math.cos(theta)]]
        );

        const sigma = nj.dot(nj.dot(R, nj.array([[Math.pow(sigma_x, 2), 0], [0, Math.pow(sigma_y, 2)]])), nj.transpose(R));

        if (typeof size == 'undefined') {
            size = (Math.ceil(7.5 * sigma.get(1, 1) ** 0.5), Math.ceil(7.5 * sigma.get(0, 0) ** 0.5));
        }


        const X = nj.arange(-(size[0] - 1) / 2.0, size[0] / 2.0).reshape(1, size[0]);
        const Y = nj.arange(-(size[1] - 1) / 2.0, size[1] / 2.0).reshape(size[1], 1);

        const gauss = nj.exp((this.broadcast(X.pow(2).divide(sigma.get(0, 0)), Y.pow(2).divide(sigma.get(1, 1)), '+').subtract(this.broadcast(X, Y, '*').multiply(2 * sigma.get(1, 0) / sigma.get(0, 0) / sigma.get(1, 1)))).multiply(-0.5 / (1 - this.prod(sigma.slice([null, null, -1, null]).diag()) / this.prod(sigma.diag())))).multiply(1.0 / this.det(sigma) ** 0.5 * 2.0 * Math.PI);

        



        return gauss.divide(gauss.sum());
    }

    det(matrix) {
        return matrix.get(0, 0) * matrix.get(1, 1) - matrix.get(0, 1) * matrix.get(1, 0);
    }

    prod(matrix) {
        return nj.flatten(matrix).tolist().reduce((acc, v) => acc * v);
    }

    broadcast(m1, m2, op) {
        const result = nj.zeros([m1.shape[1], m2.shape[0]])
        for (var i = 0; i < m1.shape[1]; i++) {
            for (var j = 0; j < m2.shape[0]; j++) {
                var r = 0/0;
                if (op == '+') {
                    r = m1.get(0, i) + m2.get(j, 0);
                } else if (op == '*') {
                    r = m1.get(0, i) * m2.get(j, 0)
                }
                result.set(i, j, r);
            }
        }
        return result;
    }
}