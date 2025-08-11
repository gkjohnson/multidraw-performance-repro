// Based on
// https://webglfundamentals.org/webgl/lessons/webgl-data-textures.html

// settings
const INSTANCE_COUNT = 500_000;
const TEX_SIZE = Math.ceil( Math.sqrt( 16 * INSTANCE_COUNT ) );

// stats
const stats = new Stats();
document.body.appendChild( stats.domElement );

// params
const params = {
  mode: 0,
  modelInView: false,
};

const gui = new lil.GUI();
gui.add( params, 'modelInView' );
gui.add( params, 'mode', {
  TEXTURE_UPLOAD: 0,
  INSTANCING: 1,
  MULTI_DRAW: 2,
} );

// Get A WebGL context
const canvas = document.querySelector( '#canvas' );
const gl = canvas.getContext( 'webgl2' );

// setup GLSL program
const program = webglUtils.createProgramFromScripts( gl, [ 'vertex-shader-3d', 'fragment-shader-3d' ] );

// look up where the vertex data needs to go.
const positionLocation = gl.getAttribLocation( program, 'a_position' );
const texcoordLocation = gl.getAttribLocation( program, 'a_texcoord' );

// lookup uniforms
const matrixLocation = gl.getUniformLocation( program, 'u_matrix' );
const textureLocation = gl.getUniformLocation( program, 'u_texture' );

// Create a buffer for positions
const positionBuffer = gl.createBuffer();
gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
setGeometry( gl );

// provide texture coordinates for the rectangle.
const texcoordBuffer = gl.createBuffer();
gl.bindBuffer( gl.ARRAY_BUFFER, texcoordBuffer );
setTexcoords( gl );

// Create a texture.
const texture = gl.createTexture();
gl.bindTexture( gl.TEXTURE_2D, texture );

// fill texture with 3x2 pixels
const data = new Uint8Array( TEX_SIZE * TEX_SIZE * 4 );
for ( let i = 0; i < data.length; i ++ ) {

  data[ i ] = Math.random() * 255;

}

gl.pixelStorei( gl.UNPACK_ALIGNMENT, 1 );
gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, TEX_SIZE, TEX_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, data );

// set the filtering so we don't need mips and it's not filtered
gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );


// multidraw extension
const ext = gl.getExtension( 'WEBGL_multi_draw' );
const multiDrawStarts = new Int32Array( INSTANCE_COUNT ).fill( 0 );
const multiDrawCounts = new Int32Array( INSTANCE_COUNT ).fill( 6 * 6 );

// log buffer sizes
console.log( 'Instance count:', `${ INSTANCE_COUNT }` );
console.log( 'Texture size: ', getBufferSize( data ) );
console.log( 'Multi draw starts size: ', getBufferSize( multiDrawStarts ) );
console.log( 'Multi draw counts size: ', getBufferSize( multiDrawCounts ) );

// draw variables
const fieldOfViewRadians = degToRad( 60 );
let modelXRotationRadians = degToRad( 0 );
let modelYRotationRadians = degToRad( 0 );
let lastTime = 0;

requestAnimationFrame( drawScene );

// Draw the scene.
function drawScene( time ) {

  requestAnimationFrame( drawScene );

  stats.update();

  // convert to seconds
  time *= 0.001;

  const deltaTime = time - lastTime;
  lastTime = time;

  webglUtils.resizeCanvasToDisplaySize( gl.canvas );

  gl.viewport( 0, 0, gl.canvas.width, gl.canvas.height );
  gl.enable( gl.CULL_FACE );
  gl.enable( gl.DEPTH_TEST );

  // Animate the rotation
  modelYRotationRadians += - 0.7 * deltaTime;
  modelXRotationRadians += - 0.4 * deltaTime;

  // Clear the canvas AND the depth buffer.
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

  // Tell it to use our program (pair of shaders)
  gl.useProgram( program );

  // Turn on the position attribute
  gl.enableVertexAttribArray( positionLocation );
  gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
  gl.vertexAttribPointer( positionLocation, 3, gl.FLOAT, false, 0, 0 );

  // Turn on the texcoord attribute
  gl.enableVertexAttribArray( texcoordLocation );
  gl.bindBuffer( gl.ARRAY_BUFFER, texcoordBuffer );
  gl.vertexAttribPointer( texcoordLocation, 2, gl.FLOAT, false, 0, 0 );

  // Compute the projection matrix
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const projectionMatrix = m4.perspective( fieldOfViewRadians, aspect, 1, 2000 );

  // Compute the camera's matrix using look at.
  const target = params.modelInView ? [ 0, 0, 0 ] : [ 0, 0, 10 ];
  const cameraMatrix = m4.lookAt( [ 0, 0, 2 ], target, [ 0, 1, 0 ] );

  // Make a view matrix from the camera matrix.
  const viewMatrix = m4.inverse( cameraMatrix );
  const viewProjectionMatrix = m4.multiply( projectionMatrix, viewMatrix );
  let matrix = m4.xRotate( viewProjectionMatrix, modelXRotationRadians );
  matrix = m4.yRotate( matrix, modelYRotationRadians );

  // Set the matrix.
  gl.uniformMatrix4fv( matrixLocation, false, matrix );

  // Tell the shader to use texture unit 0 for u_texture
  gl.uniform1i( textureLocation, 0 );

  // 
  if ( params.mode === 0 ) {

    // update the texture
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei( gl.UNPACK_ALIGNMENT, 1 );
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, TEX_SIZE, TEX_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, data );

    gl.drawArrays( gl.TRIANGLES, 0, 6 * 6 );

  } else if ( params.mode === 1 ) {

    // draw instances with drawArraysInstanced
    gl.drawArraysInstanced( gl.TRIANGLES, 0, 6 * 6, INSTANCE_COUNT );

  } else if ( params.mode === 2 ) {

    // draw instances with multiDrawArrays
    ext.multiDrawArraysWEBGL( gl.TRIANGLES, multiDrawStarts, 0, multiDrawCounts, 0, INSTANCE_COUNT );

  }

}

// Fill the buffer with the values that define a cube.
function setGeometry( gl ) {

	const positions = new Float32Array(
		[
			- 0.5, - 0.5, - 0.5,
			- 0.5, 0.5, - 0.5,
			0.5, - 0.5, - 0.5,
			- 0.5, 0.5, - 0.5,
			0.5, 0.5, - 0.5,
			0.5, - 0.5, - 0.5,

			- 0.5, - 0.5, 0.5,
			0.5, - 0.5, 0.5,
			- 0.5, 0.5, 0.5,
			- 0.5, 0.5, 0.5,
			0.5, - 0.5, 0.5,
			0.5, 0.5, 0.5,

			- 0.5, 0.5, - 0.5,
			- 0.5, 0.5, 0.5,
			0.5, 0.5, - 0.5,
			- 0.5, 0.5, 0.5,
			0.5, 0.5, 0.5,
			0.5, 0.5, - 0.5,

			- 0.5, - 0.5, - 0.5,
			0.5, - 0.5, - 0.5,
			- 0.5, - 0.5, 0.5,
			- 0.5, - 0.5, 0.5,
			0.5, - 0.5, - 0.5,
			0.5, - 0.5, 0.5,

			- 0.5, - 0.5, - 0.5,
			- 0.5, - 0.5, 0.5,
			- 0.5, 0.5, - 0.5,
			- 0.5, - 0.5, 0.5,
			- 0.5, 0.5, 0.5,
			- 0.5, 0.5, - 0.5,

			0.5, - 0.5, - 0.5,
			0.5, 0.5, - 0.5,
			0.5, - 0.5, 0.5,
			0.5, - 0.5, 0.5,
			0.5, 0.5, - 0.5,
			0.5, 0.5, 0.5,

		] );
	gl.bufferData( gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW );

}

// Fill the buffer with texture coordinates the cube.
function setTexcoords( gl ) {

	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(
			[
				0, 0,
				0, 1,
				1, 0,
				0, 1,
				1, 1,
				1, 0,

				0, 0,
				0, 1,
				1, 0,
				1, 0,
				0, 1,
				1, 1,

				0, 0,
				0, 1,
				1, 0,
				0, 1,
				1, 1,
				1, 0,

				0, 0,
				0, 1,
				1, 0,
				1, 0,
				0, 1,
				1, 1,

				0, 0,
				0, 1,
				1, 0,
				0, 1,
				1, 1,
				1, 0,

				0, 0,
				0, 1,
				1, 0,
				1, 0,
				0, 1,
				1, 1,

			] ),
		gl.STATIC_DRAW );

}

function degToRad( d ) {

  return d * Math.PI / 180;

}

function getBufferSize( buffer ) {

  if ( 'buffer' in buffer ) {

    buffer = buffer.buffer;

  }

  return ( buffer.byteLength * 1e-6 ).toFixed( 3 ) + ' MB';

}
