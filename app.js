window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById('canvas'); // get canvas element by id
  const gl = canvas.getContext('webgl'); // create a webgl rendering context for canvas
  /*
  =======================================================================
  The code defines two shader sources:

  1- vertex shader
  2- fragment shader

  The vertex shader is responsible for transforming the input vertex positions.

  The fragment shader is responsible for calculating the color of each 
  fragment (per pixel) in the rendered image.
  =======================================================================
  */

  // create the vertex shader source
  const vertexShaderSource = `
  attribute vec2 position; // Declares the vertex attribute position as a 2D vector representing the vertex position

  // the main function of the vertex
  void main() {
    // Built-in variable that represents the transformed vertex position
    gl_Position = vec4(position, 0.0, 1.0);
  }
  `;

  // create the fragment shader source
  const fragmentShaderSource = `
    precision mediump float; // Specifies the floating-point precision for the shader

    uniform vec2 resolution; //  Represents the resolution (width and height) of the canvas
    uniform float time; // Represents the time in seconds since the start of the shader effect

    #define TAU 6.28318530718 // Defines the value of Tau(2 * pi) for mathematical calculations
    #define MAX_ITER 5 // Defines the maximum number of iterations for a loop in the shader

    // this function acts as an entry point and calls this function to determine the color value for each fragment
    // fragColor represents the final color of the current fragment
    // fragCoord represents the coordinate of the current fragment in x:the horizontal(column) and y:the vertical(row)
    void mainImage(out vec4 fragColor, in vec2 fragCoord) { 
      // Shader Code with mathematical calculations
      float time = time * 0.5 + 23.0;
      vec2 uv = fragCoord.xy / resolution.xy;

    #ifdef SHOW_TILING
      vec2 p = mod(uv * TAU * 2.0, TAU) - 250.0;
    #else
      vec2 p = mod(uv * TAU, TAU) - 250.0;
    #endif

      vec2 i = vec2(p);
      float c = 1.0;
      float inten = 0.005;

      for (int n = 0; n < MAX_ITER; n++) {
        float t = time * (1.0 - (3.5 / float(n + 1)));
        i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
        c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
      }

      c /= float(MAX_ITER);
      c = 1.17 - pow(c, 1.4);
      vec3 colour = vec3(pow(abs(c), 8.0));
      colour = clamp(colour + vec3(0.0, 0.35, 0.5), 0.0, 1.0);

    #ifdef SHOW_TILING
      vec2 pixel = 2.0 / resolution.xy;
      uv *= 2.0;
      float f = floor(mod(time * 0.5, 2.0));  // Flash value.
      vec2 first = step(pixel, uv) * f;        // Rule out first screen pixels and flash.
      uv = step(fract(uv), pixel);              // Add one line of pixels per tile.
      colour = mix(colour, vec3(1.0, 1.0, 0.0), (uv.x + uv.y) * first.x * first.y); // Yellow line
    #endif

      fragColor = vec4(colour, 1.0);
    }

    void main() {
      vec4 fragColor;
      mainImage(fragColor, gl_FragCoord.xy);
      gl_FragColor = fragColor;
    }
  `;

  /*
  =======================================================================
  ============================Helper functions===========================
  =======================================================================
  */

  // Function to create a shader
  function createShader(gl, type, source) {
    const shader = gl.createShader(type); // create the shader object
    gl.shaderSource(shader, source); // sets the source code of the shader
    gl.compileShader(shader); // compiles the shader source code
    // Retrieves the compilation status of the shader
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS); 
    if (success) {
      return shader;
    }
    // if the shader compilation fails returns the error info and delete the shader
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }

  // Function to create the shader program
  function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram(); // creates a shader program object
    // Attaches shader parameters (vertex shader and fragment shader) to the program
    gl.attachShader(program, vertexShader); 
    gl.attachShader(program, fragmentShader); 
    // Links the shader program
    gl.linkProgram(program);
    // Retrieves the linking status of the program
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    
    if (success) {
      return program;
    }
    // Retrieves the linking log of the program if the program contains error and delete the program
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }

  /*
  =======================================================================
  ==========================Shader Program Setup=========================
  =======================================================================
  */

  // Compiles the vertex shader
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  // Compiles the fragment shader
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  // Creates the shader program by linking the vertex and fragment shaders
  const program = createProgram(gl, vertexShader, fragmentShader);

  // Vertex Attribute and Buffer Setup

  // Retrieves the attribute location of the position attribute in the shader program
  const positionAttributeLocation = gl.getAttribLocation(program, "position");
  // Creates a buffer object
  const positionBuffer = gl.createBuffer();
  // Binds the buffer to the ARRAY_BUFFER target
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Setup the positions for the shader
  const positions = [
    -1, -1,
    1, -1,
    -1, 1,
    1, 1,
  ];
  // Specifies the vertex data and assigns it to the buffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  /*
  =======================================================================
  ===============================Rendering===============================
  =======================================================================
  */

  // Sets the current shader program
  gl.useProgram(program);

  //  Enables the vertex attribute array
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Binds the position buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const size = 2;          // 2 components per iteration
  const type = gl.FLOAT;   // the data is 32bit floats
  const normalize = false; // don't normalize the data
  const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  const offset = 0;        // start at the beginning of the buffer
  
  // Specifies the attribute location, size, type, and other parameters for the vertex attribute
  gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

  const resolutionUniformLocation = gl.getUniformLocation(program, "resolution");
  const timeUniformLocation = gl.getUniformLocation(program, "time");

  // resize the canvas and make it responsive
  function resizeCanvasToDisplaySize(canvas) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); // Sets the viewport dimentions
    canvas.width = window.innerWidth; // Sets the width of the canvas
    canvas.height = window.innerHeight; // Sets the height of the canvas
  }

  // Rendering the shader
  function render() {
    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Sets the clear color to transporent black
    gl.clearColor(0, 0, 0, 1);
    // Clears the color buffer
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Sets the resolution uniform value
    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    // Sets the time uniform value
    gl.uniform1f(timeUniformLocation, performance.now() / 1000);

    // Renders the shader effect using a triangle strip
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Initiales the rendering loop by recursively calling the render function
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})
