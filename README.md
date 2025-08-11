# multidraw-performance-repro

Reproduction case demonstrating a drastic performance dip when drawing instances with the WebGL `EXT_MULTI_DRAW` extension. The repro compares drawing 500,000 instances to drawArraysInstanced and a texture upload.

- Geometry is drawn offscreen to remove any possibility of fragment shading being the performance bottleneck.
- Multi draw is compared to multiDrawArrays to demonstrate that simply drawing many instances is not a bottleneck on its own.
- Multi draw is compared to uploading a large texture every frame to demonstrate that uploading "start" and "count" buffers for multi draw does not lead to a performance bottleneck on its own.

It seems there is some unexplained bottleneck impacting the performance of the multi draw extension.

See the live repro [here](https://gkjohnson.github.io/multidraw-performance-repro) and code [here](./index.js).

## Performance

Framerate measured on a "2021 Mackbook M1 Pro, OSX 15.6" and "Chrome 139.0.7258.66" using the stats panel in the upper left of the demo page. Note that the framerate of the browser caps at 120 fps.

| MULTI_DRAW | INSTANCING | TEXTURE_UPLOAD |
|---|---|---|
| 21 fps | 120 fps | 120 fps |

Multidraw incurs at least an 80% drop in performance when issuing the command with a large amount of objects.

## Modes

Here the multiple modes of demo are explained.

### TEXTURE_UPLOAD

Re-uploads ~32MB of texture data every frame and draws the geometry using `gl.drawArrays`.

### INSTANCING

Draws the geometry as 500,000 instances using `gl.drawArraysInstanced`.

### MULTI_DRAW

Draws the geometry as 500,000 instances using `EXT_MULTI_DRAW` extension and `ext.multiDrawArraysWEBGL`. Both the `firstsList` and `countsList` are Int32Arrays with 500,000 elements resulting in a total of 4MB that need to be issued to the GPU.
