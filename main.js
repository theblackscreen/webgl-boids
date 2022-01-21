function webgl_setup(){
    // first, we obtain necessary context and shader code from our page
    var gl = document.getElementById('can').getContext('webgl');
    var source_vs = document.getElementById('vertex-shader').textContent;
    var source_fs = document.getElementById('fragment-shader').textContent;

    // creating the shaders
    var vs = gl.createShader(gl.VERTEX_SHADER);
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vs, source_vs);
    gl.shaderSource(fs, source_fs);
    gl.compileShader(vs);
    gl.compileShader(fs);
    // attaching the shaders to our program
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.validateProgram(program);

    // returning the context and shader program
    return [gl, program];
}

function obj_loader(obj_string){
    // loading the obj
    var source_obj = obj_string;
    var line_sep_src = source_obj.split('\n');

    var vertices = [];
    var indices = [];
    for(var i = 0; i < line_sep_src.length; i++){

	var line = line_sep_src[i].trim();
	if(line == '')
	    continue;

	var str_vals = line.split(' ').splice(1);
	var flt_vals = []
	for(var j = 0; j < str_vals.length; j++)
	    flt_vals.push(parseFloat(str_vals[j]));

	// we'll assign a random color for each vertex
	var col_vals = [Math.random(), Math.random(), Math.random()].map(x => 0.5 + x/10);

	if(line[0] == 'v'){
	    // storing the vertex position data
	    for(var j = 0; j < flt_vals.length; j++)
		vertices.push(flt_vals[j]);
	    // storing the vertex color data
	    for(var j = 0; j < col_vals.length; j++)
		vertices.push(col_vals[j]);
	}
	if(line[0] == 'f'){
	    // storing the index values
	    for(var j = 0; j < flt_vals.length; j++)
		indices.push(flt_vals[j] - 1); // .obj file starting index is 1, so we'll change it into 0
	}
    }

    // we'll return the list of vertices and indices
    return [vertices, indices];
}

var webgl_setup_vars = webgl_setup();
var gl = webgl_setup_vars[0];
var program = webgl_setup_vars[1];
var plane_obj = obj_loader(document.getElementById('plane.obj').textContent);

var scene = {
    data: {
	'cam-pos': [0, 0, -8],
	'cam-look': [0, 0, 0],
	'cam-up': [0, 1, 0],
	'cam-fov': 0.785,
	'cam-asr': 500/500,
	'cam-start': 0.01,
	'cam-end': 1000,
	'world-pos': [0, 0, 0],
	'world-rot-axis': [0, 1, 0],
	'world-rot-angle': 0,
	'world-scale': [1, 1, 1]
    },
    transform_matrix: function(){
	// creating the needed matrices...
	var perspective = glMatrix.mat4.create();
	glMatrix.mat4.perspective(perspective, this.data['cam-fov'], this.data['cam-asr'], this.data['cam-start'], this.data['cam-end']);
	var view = glMatrix.mat4.create();
	glMatrix.mat4.lookAt(view, this.data['cam-pos'], this.data['cam-look'], this.data['cam-up']);
	var world_scale = glMatrix.mat4.create();
	glMatrix.mat4.scale(world_scale, world_scale, this.data['world-scale']);
	var world_rot = glMatrix.mat4.create();
	glMatrix.mat4.rotate(world_rot, world_rot, this.data['world-rot-angle'], this.data['world-rot-axis']);
	var world_trans = glMatrix.mat4.create();
	glMatrix.mat4.translate(world_trans, world_trans, this.data['world-pos']);
	var result = glMatrix.mat4.create();
	// multiplying everything in order (world → view → perspective)
	glMatrix.mat4.multiply(result, world_scale, result);
	glMatrix.mat4.multiply(result, world_rot, result);
	glMatrix.mat4.multiply(result, world_trans, result);
	glMatrix.mat4.multiply(result, view, result);
	glMatrix.mat4.multiply(result, perspective, result);
	return result;	
    }
};

function create_plane_3D(){
    return {
	data: {
	    'position': [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5].map(x => 5*x),
	    'velocity': [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5].map(x => 1*x),
	    'scale': [1, 1, 1].map(x => 1*x),
	    'axis-rot': [1, 0, 0],
	    'angle-rot': Math.PI,
	    'vertices': plane_obj[0],
	    'indices': plane_obj[1]
	},
	transform_matrix: function(){
	    // creating the needed matrices
	    var scale = glMatrix.mat4.create();
	    glMatrix.mat4.scale(scale, scale, this.data['scale']);
	    var rotat = glMatrix.mat4.create();
	    glMatrix.mat4.rotate(rotat, rotat, this.data['angle-rot'], this.data['axis-rot']);
	    var infront = this.data['position'].slice();
	    glMatrix.vec3.add(infront, infront, this.data['velocity']);
	    var target = glMatrix.mat4.create();
	    glMatrix.mat4.targetTo(target, this.data['position'], infront, [0, 0, -1]);
	    var trans = glMatrix.mat4.create();
	    glMatrix.mat4.translate(trans, trans, this.data['position']);
	    // multiplying everything in order
	    var result = glMatrix.mat4.create();
	    glMatrix.mat4.multiply(result, scale, result);
	    glMatrix.mat4.multiply(result, rotat, result);
	    glMatrix.mat4.multiply(result, target, result);
	    glMatrix.mat4.multiply(result, trans, result);
	    return result;
	}
    };
}

function object_draw(object){
    // creating the VBO
    var vertArray = new Float32Array(object.data['vertices']);
    var vertSize = 6 * Float32Array.BYTES_PER_ELEMENT;
    var posOffset = 0;
    var colOffset = 3 * Float32Array.BYTES_PER_ELEMENT;

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertArray, gl.STATIC_DRAW);

    // creating the IBO
    var indxArray = new Uint16Array(object.data['indices']);
    var indxSize = 3 * Uint16Array.BYTES_PER_ELEMENT;
    var posOffset = 0;
    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indxArray, gl.STATIC_DRAW);

    // attaching the attributes to the correct position in our VBO
    var posAtt = gl.getAttribLocation(program, 'vertPosition');
    gl.vertexAttribPointer(
	posAtt,
	3,
	gl.FLOAT,
	gl.FALSE,
	vertSize,
	posOffset
    );
    gl.enableVertexAttribArray(posAtt);

    var colAtt = gl.getAttribLocation(program, 'vertColor');
    gl.vertexAttribPointer(
	colAtt,
	3,
	gl.FLOAT,
	gl.FALSE,
	vertSize,
	colOffset
    );
    gl.enableVertexAttribArray(colAtt);
    // we set the current rendering state
    gl.useProgram(program);

    var scene_transform_matrix = scene.transform_matrix();
    var object_transfom_matrix = object.transform_matrix();

    var mvp = glMatrix.mat4.create();
    glMatrix.mat4.multiply(mvp, object_transfom_matrix, mvp);
    glMatrix.mat4.multiply(mvp, scene_transform_matrix, mvp);

    var mvpAtt = gl.getUniformLocation(program, 'mvp');
    gl.uniformMatrix4fv(mvpAtt, false, mvp);

    // finally, rendering the image
    gl.drawElements(gl.TRIANGLES, indxArray.length, gl.UNSIGNED_SHORT, 0);
}

var boids = {
    data: {
	'max_num': 20,
	'distance-max': .5,
	'angle-max': Math.PI,
	'elements': [],
	'separation': true,
	'separation-scale': 1/20,
	'alignment': true,
	'alignment-scale': 1/16,
	'cohesion': true,
	'cohesion-scale': 1/8
    },
    setup: function(){
	for(var i = 0; i < this.data['max_num']; i++)
	    this.data['elements'].push(create_plane_3D());
    },
    render: function(){
	for(var i = 0; i < this.data['max_num']; i++)
	    object_draw(this.data['elements'][i]);
    },
    timestep: function(delta){
	// in order to avoid issues with velocity changes, we'll store changed
	// copies in the following array
	var next_elements = [];
	
	for(var i = 0; i < this.data['max_num']; i++){
	    var cur = this.data['elements'][i];
	    // in order to apply the boid rules, we have to get a list of nearest boids
	    var nearest = [];
	    for(var j = 0; j < this.data['max_num']; j++)
		if(i != j){
		    var other = this.data['elements'][j];
		    var distance = glMatrix.vec3.distance(cur.data['position'], other.data['position']);
		    var angle = glMatrix.vec3.angle(cur.data['position'], other.data['position']);
		    if(distance < this.data['distance-max'] && angle < this.data['angle-max'])
			nearest.push(other);
		}
	    // if there are any nearest neighbours, we modify the velocity of the current boid based on the boid-like rules
	    if(nearest.length != 0){
		var velocity_change = [0, 0, 0];
		if(this.data['separation']){
		    var away_direction = [0, 0, 0];
		    for(var j = 0; j < nearest.length; j++){
			var other = nearest[j];
			var opposite = [0, 0, 0];
			glMatrix.vec3.sub(opposite, other.data['position'], cur.data['position']);
			// if the other object is close, then it should have a bigger effect
			var distance = glMatrix.vec3.distance(cur.data['position'], other.data['position']);
			glMatrix.vec3.scale(opposite, opposite, 1 / (distance * 1));
			// glMatrix.vec3.scale(opposite, opposite, 1 / (distance * distance)); // should be more correct, but is more intense and harder to controll
			glMatrix.vec3.sub(away_direction, away_direction, opposite);
		    }
		    glMatrix.vec3.scale(away_direction, away_direction, this.data['separation-scale']);
		    glMatrix.vec3.add(velocity_change, velocity_change, away_direction);
		}
		if(this.data['alignment']){
		    var avg_other_velocity = [0, 0, 0]
		    for(var j = 0; j < nearest.length; j++){
			var other = nearest[j];
			glMatrix.vec3.add(avg_other_velocity, avg_other_velocity, other.data['velocity']);			
		    }
		    glMatrix.vec3.scale(avg_other_velocity, avg_other_velocity, 1 / nearest.length);
		    glMatrix.vec3.sub(avg_other_velocity, avg_other_velocity, cur.data['velocity']);
		    glMatrix.vec3.scale(avg_other_velocity, avg_other_velocity, this.data['alignment-scale']);	
		    glMatrix.vec3.add(velocity_change, velocity_change, avg_other_velocity);
		}
		if(this.data['cohesion']){
		    var avg_other_position = [0, 0, 0];
		    for(var j = 0; j < nearest.length; j++){
			var other = nearest[j];
			glMatrix.vec3.add(avg_other_position, avg_other_position, other.data['position'])
		    }
		    glMatrix.vec3.scale(avg_other_position, avg_other_position, 1/ nearest.length);
		    glMatrix.vec3.sub(avg_other_position, avg_other_position, cur.data['position']);
		    glMatrix.vec3.scale(avg_other_position, avg_other_position, this.data['cohesion-scale']);	
		    glMatrix.vec3.add(velocity_change, velocity_change, avg_other_position);

		}

		// after calculating all of the other changes, we'll only change the direction
		// of the current velocity: remembering the magnitude of old velocity, and
		// scaling the sum of normalized change vector and current velocity.
		// we do this in order to maintain the same magnitude of the object velocity
		
		
		var magnitude = glMatrix.vec3.len(cur.data['velocity']);
		glMatrix.vec3.add(cur.data['velocity'], cur.data['velocity'], velocity_change);
		glMatrix.vec3.normalize(cur.data['velocity'], cur.data['velocity']);
		glMatrix.vec3.scale(cur.data['velocity'], cur.data['velocity'], magnitude);

	    }

	    // we update the positon based on the velocity vector
	    var move_vector = cur.data['velocity'].slice();
	    glMatrix.vec3.scale(move_vector, move_vector, delta);
	    glMatrix.vec3.add(cur.data['position'], cur.data['position'], move_vector);

	    // this will make the position behave more like a loop
	    var bounds = 1.5;
	    if(cur.data['position'][0] > bounds) cur.data['position'][0] -= 2*bounds;
	    if(cur.data['position'][0] < -bounds) cur.data['position'][0] += 2*bounds;
	    if(cur.data['position'][1] > bounds) cur.data['position'][1] -= 2*bounds;
	    if(cur.data['position'][1] < -bounds) cur.data['position'][1] += 2*bounds;
	    if(cur.data['position'][2] > bounds) cur.data['position'][2] -= 2*bounds;
	    if(cur.data['position'][2] < -bounds) cur.data['position'][2] += 2*bounds;
	    
	}
    }	
}

boids.setup();

var old_time = performance.now();
function render(){
    
    // clearing the screen
    gl.clearColor(0.8, 0.8, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // rendering the boids
    boids.render();

    // calculating the time passed
    var now_time = performance.now();
    var delta = now_time - old_time;
    old_time = now_time;

    // executing the time step function
    boids.timestep(delta * 0.001);
    
    // continuing the render loop
    requestAnimationFrame(render);
}

// defining basic camera controls
document.onkeypress = function(e){
    var move = .1;
    if(e.which == 97){
	scene.data['cam-pos'][0] += move;
	scene.data['cam-look'][0] += move;
    }
    if(e.which == 100){
	scene.data['cam-pos'][0] -= move;
	scene.data['cam-look'][0] -= move;
    }
    if(e.which == 119){
	scene.data['cam-pos'][1] += move;
	scene.data['cam-look'][1] += move;
    }
    if(e.which == 115){
	scene.data['cam-pos'][1] -= move;
	scene.data['cam-look'][1] -= move;
    }
    if(e.which == 106){
	scene.data['cam-pos'][2] += move;
	scene.data['cam-look'][2] += move;
    }
    if(e.which == 107){
	scene.data['cam-pos'][2] -= move;
	scene.data['cam-look'][2] -= move;
    }
}

// making the sliders have appropriate effects
document.getElementById('cohesionSlider').oninput = function(){
    var slider_val = this.value;
    boids.data['cohesion-scale'] = slider_val / 100;
}

document.getElementById('alignmentSlider').oninput = function(){
    var slider_val = this.value;
    boids.data['alignment-scale'] = slider_val / 100;
}

document.getElementById('separationSlider').oninput = function(){
    var slider_val = this.value;
    boids.data['separation-scale'] = slider_val / 100;
}

document.getElementById('distanceSlider').oninput = function(){
    var slider_val = this.value;
    boids.data['distance-max'] = slider_val / 100;
}

// starting the render loop
gl.enable(gl.DEPTH_TEST);
requestAnimationFrame(render);
