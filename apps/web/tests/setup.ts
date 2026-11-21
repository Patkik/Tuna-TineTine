// Vitest test setup
// Canvas mock for jsdom if needed
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Array(4) }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      ellipse: () => {},
      roundRect: () => {},
    };
  }) as any;

  HTMLCanvasElement.prototype.toBlob = function (callback) {
    callback(new Blob(['mock-image-data'], { type: 'image/png' }));
  };
}
