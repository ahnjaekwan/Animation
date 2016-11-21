// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(),	thrust = vec3(), 	looking = false, prev_time = 0, animate = false, animation_time = 0;
		var gouraud = false, color_normals = false, solid = false;
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( vec4( .8,.3,.8,1 ), .5, 1, 1, 40, "" ) ); }


// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!

var texture_filenames_to_load = ["stars.png", "text.png", "earth.gif", "gold.png", "wood.png", "brown.png", "grass.png",
    "door.png", "beige.png", "silver.png", "black.png", "floor.png", "iron.png"];

// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {	var anim = new Animation();	}
function Animation()
{
	( function init (self) 
	{
		self.context = new GL_Context( "gl-canvas" );
		self.context.register_display_object( self );
		
		gl.clearColor( 0, 0, 0, 1 );			// Background color
		
		for( var i = 0; i < texture_filenames_to_load.length; i++ )
			initTexture( texture_filenames_to_load[i], true );
		
		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );	
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );
		self.m_capped_cylinder = new capped_cylinder();
		self.m_octahedron = new octahedron(mat4());
		self.m_star = new star(mat4()); /////////
		// 1st parameter is camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translation(0, 0,-40), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );

		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		gl.uniform1i( g_addrs.SOLID_loc, solid);
		
		self.context.render();	
	} ) ( this );	
	
	canvas.addEventListener('mousemove', function(e)	{		e = e || window.event;		movement = vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2, 0);	});
}

// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0,  1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;
	shortcut.add( ".",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0, -1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;

	shortcut.add( "r",     ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+s", function() { solid = !solid;					gl.uniform1i( g_addrs.SOLID_loc, solid);	
																		gl.uniform4fv( g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1) );	 } );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud;				gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);	} );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );	
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70, border = 50;
		var degrees_per_frame = .0002 * animation_delta_time;
		var meters_per_frame  = .01 * animation_delta_time;
																					// Determine camera rotation movement first
		var movement_plus  = [ movement[0] + leeway, movement[1] + leeway ];		// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
		var movement_minus = [ movement[0] - leeway, movement[1] - leeway ];
		var outside_border = false;
		
		for( var i = 0; i < 2; i++ )
			if ( Math.abs( movement[i] ) > canvas_size[i]/2 - border )	outside_border = true;		// Stop steering if we're on the outer edge of the canvas.

		for( var i = 0; looking && outside_border == false && i < 2; i++ )			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

// *******************************************************	
// display(): called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
	{
		if(!time) time = 0;
		this.animation_delta_time = time - prev_time;
		if(animate) this.graphicsState.animation_time += this.animation_delta_time;
		prev_time = time;
		
		update_camera( this, this.animation_delta_time );
			
		this.basis_id = 0;
		
		var model_transform = mat4();
		
		// Materials: Declare new ones as needed in every function.
		// 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
		var purplePlastic = new Material( vec4( .9,.5,.9,1 ), .2, .5, .8, 40 ), // Omit the final (string) parameter if you want no texture
			greyPlastic = new Material(vec4(.5, .5, .5, 1), .2, .8, .5, 20),
            redPlastic = new Material(vec4(255, 0, 0), .2, .8, .5, 20),
            greenPlastic = new Material(vec4(0, 128, 0), .8, .8, .5, 20),
			earth = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "earth.gif"),
			grass = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "grass.png"),
			floor = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "floor.png"),
			wood = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "wood.png"),
			beige = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "beige.png"),
			door = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "door.png"),
			black = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "black.png"),
			silver = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "silver.png"),
			brown = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "brown.png"),
			iron = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "iron.png"),
			gold = new Material(vec4(.5, .5, .5, 1), .5, 1, .5, 40, "gold.png"),
			stars = new Material( vec4( .5,.5,.5,1 ), .5, 1, 1, 40, "stars.png" );
			
		/**********************************
		Start coding here!!!!
		**********************************/
		
		var stack = [];
		stack.push(model_transform); //scene7
		stack.push(model_transform); //scene6
		stack.push(model_transform); //scene5
		stack.push(model_transform); //scene4
		stack.push(model_transform); //scene3
		stack.push(model_transform); //scene2

    //scene1
    //trophy
		stack.push(model_transform);//1
		model_transform = mult(model_transform, translation(0, 7, 0));
		this.m_star.draw(this.graphicsState, model_transform, purplePlastic); // star with gold color
		stack.push(model_transform);//2
		model_transform = mult(model_transform, translation(0, -2.5, 0));
		model_transform = mult(model_transform, scale(0.5, 1, 1));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, gold); // with gold color
		model_transform = stack.pop();//1
		stack.push(model_transform);//2
		model_transform = mult(model_transform, translation(0, -5, 0));
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		model_transform = mult(model_transform, scale(1, 1, 3));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, gold); // brown color
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, -7, 0));
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		model_transform = mult(model_transform, scale(1.25, 1, 1));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, gold); // brown color
    //table
		model_transform = stack.pop();//0
		stack.push(model_transform);//1
		model_transform = mult(model_transform, translation(0, -0.75, 0));
		model_transform = mult(model_transform, scale(20, 0.5, 15));
		this.m_cube.draw(this.graphicsState, model_transform, wood); // wood color
		for (var i = -1; i < 2; i += 2) {
		    for (var j = -1; j < 2; j += 2) {
		        model_transform = stack.pop();//0
		        stack.push(model_transform);//1
		        model_transform = mult(model_transform, translation(9.5 * i, -3.5, 7 * j));
		        model_transform = mult(model_transform, scale(1, 5, 1));
		        this.m_cube.draw(this.graphicsState, model_transform, wood); // wood color
		    }
		}
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, translation(0, -6, 0));
		stack.push(model_transform);//1
		model_transform = mult(model_transform, scale(1000, 0.01, 1000));
		this.m_cube.draw(this.graphicsState, model_transform, beige); //beige
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, scale(500, 500, 500));
		this.m_sphere.draw(this.graphicsState, model_transform, beige); //beige

    //scene2
    //door
		model_transform = stack.pop();//scene2
		model_transform = mult(model_transform, translation(0, 10000, 0));
		stack.push(model_transform);//1
		model_transform = mult(model_transform, translation(0, 0, -30));
		model_transform = mult(model_transform, scale(1000, 1000, 1000));
		this.m_cube.draw(this.graphicsState, model_transform, beige); //beige
		model_transform = stack.pop();//0
		stack.push(model_transform);//1
		model_transform = mult(model_transform, translation(0, -15, 0));
		model_transform = mult(model_transform, scale(1000, 0.1, 1000));
		this.m_cube.draw(this.graphicsState, model_transform, floor); //floor
		model_transform = stack.pop();//0
		stack.push(model_transform);//1
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//0
		    stack.push(model_transform);//1
		    model_transform = mult(model_transform, translation(20 * i, 0, 0));
		    if (this.graphicsState.animation_time > 13000) {
		        model_transform = mult(model_transform, rotation(i * (this.graphicsState.animation_time - 13000) / 60, 0, 1, 0));
		        if (this.graphicsState.animation_time > 20000)
		            model_transform = mult(model_transform, rotation(-i * (this.graphicsState.animation_time - 20000) / 60, 0, 1, 0));
		    }
		    stack.push(model_transform);//2
		    model_transform = mult(model_transform, translation(-10 * i, 0, 0));
		    model_transform = mult(model_transform, scale(20, 30, 3));
		    this.m_cube.draw(this.graphicsState, model_transform, door); // wood color
		    model_transform = stack.pop();//1
		    model_transform = mult(model_transform, translation(-15 * i, 0, 2.5));
		    this.m_sphere.draw(this.graphicsState, model_transform, silver); // silver color
		}
    //head
		model_transform = stack.pop();//0
		stack.push(model_transform);//1
		model_transform = mult(model_transform, translation(5, 0, -20));
		if (this.graphicsState.animation_time > 13000)
		    model_transform = mult(model_transform, translation(0, 0, (this.graphicsState.animation_time - 13000) / 200));
		stack.push(model_transform);//2
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //chest
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, -2.5, 0));
		stack.push(model_transform);//2
		model_transform = mult(model_transform, scale(1, 1.5, 1));
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //arms
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//1
		    stack.push(model_transform);//2
		    model_transform = mult(model_transform, translation(1.25 * i, 0, 0));
		    stack.push(model_transform);//3
		    model_transform = mult(model_transform, rotation(30 * i, 0, 0, 1));
		    model_transform = mult(model_transform, translation(0, 0.75, 0));
		    model_transform = mult(model_transform, scale(0.2, 0.75, 0.2));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		    model_transform = stack.pop();//2
		    model_transform = mult(model_transform, translation(0, -0.75, 0));
		    model_transform = mult(model_transform, scale(0.2, 0.75, 0.2));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		}
    //legs
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, -1.5, 0));
		stack.push(model_transform);//2
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//1
		    stack.push(model_transform);//2
		    model_transform = mult(model_transform, translation(0.5 * i, 0, 0));
		    model_transform = mult(model_transform, rotation(i * 45 * Math.sin(this.graphicsState.animation_time / 500) + 20, 1, 0, 0));
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, scale(0.3, 0.75, 0.3));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		    model_transform = mult(model_transform, translation(0, -0.75, 0));
		    model_transform = mult(model_transform, rotation(i * 40 * Math.sin(this.graphicsState.animation_time / 500), 1, 0, 0));
		    model_transform = mult(model_transform, translation(0, -1, 0));
		    model_transform = mult(model_transform, scale(1, 1, 1));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		}
    //person2
    //head
		model_transform = stack.pop();//1
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, translation(-5, 0, -20));
		if (this.graphicsState.animation_time > 13000)
		    model_transform = mult(model_transform, translation(0, 0, (this.graphicsState.animation_time - 13000) / 200));
		model_transform = mult(model_transform, translation(0, -2, 0));
		stack.push(model_transform);//1
		this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
    //chest
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, translation(0, -2, 0));
		stack.push(model_transform);//1
		model_transform = mult(model_transform, scale(1.5, 1.5, 1));
		this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
    //arms
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//0
		    stack.push(model_transform);//1
		    model_transform = mult(model_transform, translation(1.75 * i, 0.25, 0));
		    stack.push(model_transform);//2
		    model_transform = mult(model_transform, rotation(45 * i, 0, 0, 1));
		    model_transform = mult(model_transform, translation(0, 0.6, 0));
		    model_transform = mult(model_transform, scale(0.3, 0.6, 0.3));
		    this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		    model_transform = stack.pop();//1
		    model_transform = mult(model_transform, translation(0, -0.6, 0));
		    model_transform = mult(model_transform, scale(0.3, 0.6, 0.3));
		    this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		}
    //legs
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, translation(0, -1, 0));
		stack.push(model_transform);//1
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//0
		    stack.push(model_transform);//1
		    model_transform = mult(model_transform, translation(0.5 * i, 0, 0));
		    model_transform = mult(model_transform, rotation(i * 45 * Math.sin(this.graphicsState.animation_time / 500) + 20, 1, 0, 0));
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, scale(0.4, 0.6, 0.4));
		    this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, rotation(i * 40 * Math.sin(this.graphicsState.animation_time / 500), 1, 0, 0));
		    model_transform = mult(model_transform, translation(0, -1, 0));
		    model_transform = mult(model_transform, scale(1, 1, 1));
		    this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		}


    //scene3
    //person1
    //head
		model_transform = stack.pop();//0
		model_transform = stack.pop();//scene3
		model_transform = mult(model_transform, translation(0, 20000, 0));
		stack.push(model_transform);//1
		model_transform = mult(model_transform, translation(0, -6.5, 0));
		model_transform = mult(model_transform, scale(1000, 0.01, 1000));
		this.m_cube.draw(this.graphicsState, model_transform, grass); //grass
		model_transform = stack.pop();//0
		stack.push(model_transform);//1
		model_transform = mult(model_transform, translation(5, 0, 0));
		model_transform = mult(model_transform, rotation(90, 0, 1, 0));
		stack.push(model_transform);//2
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //chest
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, -2.5, 0));
		stack.push(model_transform);//2
		model_transform = mult(model_transform, scale(1, 1.5, 1));
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //arms
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//1
		    stack.push(model_transform);//2
		    model_transform = mult(model_transform, translation(1.25 * i, 0, 0));
		    stack.push(model_transform);//3
		    model_transform = mult(model_transform, rotation(30 * i, 0, 0, 1));
		    model_transform = mult(model_transform, translation(0, 0.75, 0));
		    model_transform = mult(model_transform, scale(0.2, 0.75, 0.2));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		    model_transform = stack.pop();//2
		    model_transform = mult(model_transform, translation(0, -0.75, 0));
		    model_transform = mult(model_transform, scale(0.2, 0.75, 0.2));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		}
    //legs
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, -1.5, 0));
		stack.push(model_transform);//2
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//1
		    stack.push(model_transform);//2
		    model_transform = mult(model_transform, translation(0.5 * i, 0, 0));
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, scale(0.3, 0.75, 0.3));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		    model_transform = mult(model_transform, translation(0, -0.75, 0));
		    model_transform = mult(model_transform, translation(0, -1, 0));
		    model_transform = mult(model_transform, scale(1, 1, 1));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		}
    //person2
    //head
		model_transform = stack.pop();//1
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, translation(-5, 0, 0));
		model_transform = mult(model_transform, rotation(-90, 0, 1, 0));
		model_transform = mult(model_transform, translation(0, -1, 0));
		stack.push(model_transform);//1
		this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
    //chest
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, translation(0, -2, 0));
		stack.push(model_transform);//1
		model_transform = mult(model_transform, scale(1.5, 1.5, 1));
		this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
    //arms
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//0
		    stack.push(model_transform);//1
		    model_transform = mult(model_transform, translation(1.75 * i, 0.25, 0));
		    stack.push(model_transform);//2
		    model_transform = mult(model_transform, rotation(45 * i, 0, 0, 1));
		    model_transform = mult(model_transform, translation(0, 0.6, 0));
		    model_transform = mult(model_transform, scale(0.3, 0.6, 0.3));
		    this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		    model_transform = stack.pop();//1
		    model_transform = mult(model_transform, translation(0, -0.6, 0));
		    model_transform = mult(model_transform, scale(0.3, 0.6, 0.3));
		    this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		}
    //legs
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, translation(0, -1, 0));
		stack.push(model_transform);//1
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//0
		    stack.push(model_transform);//1
		    model_transform = mult(model_transform, translation(0.5 * i, 0, 0));
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, scale(0.4, 0.6, 0.4));
		    this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, translation(0, -1, 0));
		    model_transform = mult(model_transform, scale(1, 1, 1));
		    this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		}


    //scene4    
		model_transform = stack.pop();//0
		model_transform = stack.pop();//scene4
		model_transform = mult(model_transform, translation(0, 30000, 0));
		stack.push(model_transform);//1
		model_transform = mult(model_transform, translation(0, -6.5, 0));
		model_transform = mult(model_transform, scale(1000, 0.01, 1000));
		this.m_cube.draw(this.graphicsState, model_transform, grass); //grass
		model_transform = stack.pop();//0
		stack.push(model_transform);//1
		model_transform = mult(model_transform, scale(500, 500, 500));
		this.m_sphere.draw(this.graphicsState, model_transform, earth); //earth
		model_transform = stack.pop();//0
		stack.push(model_transform);//1
		model_transform = mult(model_transform, rotation(90, 0, 1, 0));
		stack.push(model_transform);//2
    //head
		stack.push(model_transform);//3
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //chest
		model_transform = stack.pop();//2
		model_transform = mult(model_transform, translation(0, -2.5, 0));
		stack.push(model_transform);//3
		model_transform = mult(model_transform, scale(1, 1.5, 1));
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //arms
		model_transform = stack.pop();//2
		stack.push(model_transform);//3
		model_transform = mult(model_transform, translation(1.25, 0, 0));
		stack.push(model_transform);//4
		model_transform = mult(model_transform, rotation(30, 0, 0, 1));
		model_transform = mult(model_transform, translation(0, 0.75, 0));
		model_transform = mult(model_transform, scale(0.2, 0.75, 0.2));
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		model_transform = stack.pop();//3
		model_transform = mult(model_transform, translation(0, -0.75, 0));
		model_transform = mult(model_transform, scale(0.2, 0.75, 0.2));
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		model_transform = stack.pop();//2
		stack.push(model_transform);//3
		model_transform = mult(model_transform, translation(-1, 0.75, 0));
		if (this.graphicsState.animation_time > 45000) {
		    model_transform = mult(model_transform, rotation(30 * Math.sin((this.graphicsState.animation_time - 45000) / 1000), 1, 0, 0));
		    if (this.graphicsState.animation_time > 50000)
		        model_transform = mult(model_transform, rotation(-30 * Math.sin((this.graphicsState.animation_time - 50000) / 1000), 1, 0, 0));
		}
		stack.push(model_transform);//4
		model_transform = mult(model_transform, translation(0, 0, 0.75));
		model_transform = mult(model_transform, scale(0.2, 0.2, 0.75));
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		model_transform = stack.pop();//3
		model_transform = mult(model_transform, translation(0, 0.75, 1.5));
		model_transform = mult(model_transform, scale(0.2, 0.75, 0.2));
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //legs
		model_transform = stack.pop();//2
		model_transform = mult(model_transform, translation(0, -1.5, 0));
		stack.push(model_transform);//3
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//2
		    stack.push(model_transform);//3
		    model_transform = mult(model_transform, translation(0.5 * i, 0, 0));
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, scale(0.3, 0.75, 0.3));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		    model_transform = mult(model_transform, translation(0, -0.75, 0));
		    model_transform = mult(model_transform, translation(0, -1, 0));
		    model_transform = mult(model_transform, scale(1, 1, 1));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		}
    /////spear
		model_transform = stack.pop();//2
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, 0, (this.graphicsState.animation_time - 45000) / 200));
		model_transform = mult(model_transform, translation(-1, -0.25, 1.5));
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		stack.push(model_transform);//2
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		model_transform = mult(model_transform, scale(0.3, 0.3, 10));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, brown); //brown
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, 5.5, 0));
		this.m_octahedron.draw(this.graphicsState, model_transform, iron); //iron
    //target
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, translation(0, 0, (this.graphicsState.animation_time - 45000) / 200));
		model_transform = mult(model_transform, translation(1, -0.25, 1.5));
		model_transform = mult(model_transform, translation(59.5, 0, -50));
		this.m_sphere.draw(this.graphicsState, model_transform, black); //black


    //scene5    
		model_transform = stack.pop();//scene5
		model_transform = mult(model_transform, translation(0, 40000, 0));
		stack.push(model_transform);//1
		model_transform = mult(model_transform, translation(0, -6.5, 0));
		model_transform = mult(model_transform, scale(1000, 0.01, 1000));
		this.m_cube.draw(this.graphicsState, model_transform, grass); //grass
		model_transform = stack.pop();//0
		stack.push(model_transform);//1
		model_transform = mult(model_transform, scale(500, 1000, 500));
		this.m_sphere.draw(this.graphicsState, model_transform, earth); //earth
		model_transform = stack.pop();//0
		stack.push(model_transform);//1
		model_transform = mult(model_transform, rotation(90, 0, 1, 0));
		stack.push(model_transform);//2
    //head
		stack.push(model_transform);//3
		this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
    //chest
		model_transform = stack.pop();//2
		model_transform = mult(model_transform, translation(0, -2, 0));
		stack.push(model_transform);//3
		model_transform = mult(model_transform, scale(1.5, 1.5, 1));
		this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
    //arms
		model_transform = stack.pop();//2
		stack.push(model_transform);//3
		model_transform = mult(model_transform, translation(1.75, 0.25, 0));
		stack.push(model_transform);//4
		model_transform = mult(model_transform, rotation(45, 0, 0, 1));
		model_transform = mult(model_transform, translation(0, 0.6, 0));
		model_transform = mult(model_transform, scale(0.3, 0.6, 0.3));
		this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		model_transform = stack.pop();//3
		model_transform = mult(model_transform, translation(0, -0.6, 0));
		model_transform = mult(model_transform, scale(0.3, 0.6, 0.3));
		this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		model_transform = stack.pop();//2
		stack.push(model_transform);//3
		model_transform = mult(model_transform, translation(-1.5, 0.75, 0));
		if (this.graphicsState.animation_time > 55000) {
		    model_transform = mult(model_transform, rotation(30 * Math.sin((this.graphicsState.animation_time - 55000) / 1000), 1, 0, 0));
		    if (this.graphicsState.animation_time > 60000)
		        model_transform = mult(model_transform, rotation(-30 * Math.sin((this.graphicsState.animation_time - 60000) / 1000), 1, 0, 0));
		}
		stack.push(model_transform);//4
		model_transform = mult(model_transform, translation(0, 0, 0.6));
		model_transform = mult(model_transform, scale(0.3, 0.3, 0.6));
		this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		model_transform = stack.pop();//3
		model_transform = mult(model_transform, translation(0, 0.6, 1.2));
		model_transform = mult(model_transform, scale(0.3, 0.6, 0.3));
		this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
    //legs
		model_transform = stack.pop();//2
		model_transform = mult(model_transform, translation(0, -1, 0));
		stack.push(model_transform);//3
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//2
		    stack.push(model_transform);//3
		    model_transform = mult(model_transform, translation(0.5 * i, 0, 0));
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, scale(0.4, 0.6, 0.4));
		    this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, translation(0, -1, 0));
		    model_transform = mult(model_transform, scale(1, 1, 1));
		    this.m_sphere.draw(this.graphicsState, model_transform, greenPlastic);
		}
    /////spear    
		model_transform = stack.pop();//2
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, 0, (this.graphicsState.animation_time - 55000) / 200));
		model_transform = mult(model_transform, translation(-1.5, -0.05, 1.2));
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		stack.push(model_transform);//2
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		model_transform = mult(model_transform, scale(0.3, 0.3, 10));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, brown); // brown
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, 5.5, 0));
		this.m_octahedron.draw(this.graphicsState, model_transform, iron); //iron
    //target miss
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, translation(0, 0, (this.graphicsState.animation_time - 55000) / 200));
		model_transform = mult(model_transform, translation(59.5, 2, -53));
		this.m_sphere.draw(this.graphicsState, model_transform, black); //black


    //scene6
    //trophy
		model_transform = stack.pop();//scene6
		model_transform = mult(model_transform, translation(0, 50000, 0));
		stack.push(model_transform);//1
		stack.push(model_transform);//2
		stack.push(model_transform);//3
		model_transform = mult(model_transform, translation(0, 7, 0));
		this.m_star.draw(this.graphicsState, model_transform, purplePlastic); // star with gold color
		stack.push(model_transform);//4
		model_transform = mult(model_transform, translation(0, -2.5, 0));
		model_transform = mult(model_transform, scale(0.5, 1, 1));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, gold); // with gold color
		model_transform = stack.pop();//3
		stack.push(model_transform);//4
		model_transform = mult(model_transform, translation(0, -5, 0));
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		model_transform = mult(model_transform, scale(1, 1, 3));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, gold); // gold color
		model_transform = stack.pop();//3
		model_transform = mult(model_transform, translation(0, -7, 0));
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		model_transform = mult(model_transform, scale(1.25, 1, 1));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, gold); // gold color
		model_transform = stack.pop();//2
    //table
		model_transform = stack.pop();//1
		stack.push(model_transform);//2
		model_transform = mult(model_transform, translation(0, -0.75, 5));
		model_transform = mult(model_transform, scale(20, 0.5, 15));
		this.m_cube.draw(this.graphicsState, model_transform, wood); // wood color
		for (var i = -1; i < 2; i += 2) {
		    for (var j = -1; j < 2; j += 2) {
		        model_transform = stack.pop();//1
		        stack.push(model_transform);//2
		        model_transform = mult(model_transform, translation(0, 0, 5));
		        model_transform = mult(model_transform, translation(9.5 * i, -3.5, 7 * j));
		        model_transform = mult(model_transform, scale(1, 5, 1));
		        this.m_cube.draw(this.graphicsState, model_transform, wood); // wood color
		    }
		}
    //winner
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, 7, -5));
    //head
		stack.push(model_transform);//2
		model_transform = mult(model_transform, scale(2, 2, 2));
		stack.push(model_transform);//3
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //chest
		model_transform = stack.pop();//2
		model_transform = mult(model_transform, translation(0, -2.5, 0));
		stack.push(model_transform);//3
		model_transform = mult(model_transform, scale(1, 1.5, 1));
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //arms
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//2
		    stack.push(model_transform);//3
		    model_transform = mult(model_transform, translation(1 * i, 0.75, 0));
		    model_transform = mult(model_transform, rotation(30, 1, 0, 0));
		    model_transform = mult(model_transform, rotation(-10 * i, 0, 1, 0));
		    stack.push(model_transform);//4
		    model_transform = mult(model_transform, translation(0, 0, 0.75));
		    model_transform = mult(model_transform, scale(0.2, 0.2, 0.75));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		    model_transform = stack.pop();//3
		    model_transform = mult(model_transform, translation(0, 0, 2.25));
		    model_transform = mult(model_transform, scale(0.2, 0.2, 0.75));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		}
    //legs
		model_transform = stack.pop();//2
		model_transform = mult(model_transform, translation(0, -1.5, 0));
		stack.push(model_transform);//3
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//2
		    stack.push(model_transform);//3
		    model_transform = mult(model_transform, translation(0.5 * i, 0, 0));
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, scale(0.3, 0.75, 0.3));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		    model_transform = mult(model_transform, translation(0, -0.75, 0));
		    model_transform = mult(model_transform, translation(0, -1, 0));
		    model_transform = mult(model_transform, scale(1, 1, 1));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		}
		model_transform = stack.pop();//2
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, -15, 0));
		model_transform = mult(model_transform, scale(1000, 0.01, 1000));
		this.m_cube.draw(this.graphicsState, model_transform, beige); //floor
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, scale(500, 500, 500));
		this.m_sphere.draw(this.graphicsState, model_transform, beige); //beige

    //scene7
    //trophy
		model_transform = stack.pop();//scene7
		model_transform = mult(model_transform, translation(0, 60000, 0));
		stack.push(model_transform);//1
		stack.push(model_transform);//2
		stack.push(model_transform);//3
		model_transform = mult(model_transform, translation(0, 3.5, -10));
		model_transform = mult(model_transform, rotation(-(this.graphicsState.animation_time - 80000) / 240, 1, 0, 0));
		model_transform = mult(model_transform, translation(0, 3.5, 10));
		this.m_star.draw(this.graphicsState, model_transform, purplePlastic); // star with gold color
		stack.push(model_transform);//4
		model_transform = mult(model_transform, translation(0, -2.5, 0));
		model_transform = mult(model_transform, scale(0.5, 1, 1));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, gold);// gold color
		model_transform = stack.pop();//3
		stack.push(model_transform);//4
		model_transform = mult(model_transform, translation(0, -5, 0));
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		model_transform = mult(model_transform, scale(1, 1, 3));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, gold);// gold color
		model_transform = stack.pop();//3
		model_transform = mult(model_transform, translation(0, -7, 0));
		model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		model_transform = mult(model_transform, scale(1.25, 1, 1));
		this.m_capped_cylinder.draw(this.graphicsState, model_transform, gold);// gold color
		model_transform = stack.pop();//2
    //table
		model_transform = stack.pop();//1
		stack.push(model_transform);//2
		model_transform = mult(model_transform, translation(0, -0.75, 5));
		model_transform = mult(model_transform, scale(20, 0.5, 15));
		this.m_cube.draw(this.graphicsState, model_transform, wood); // wood color
		for (var i = -1; i < 2; i += 2) {
		    for (var j = -1; j < 2; j += 2) {
		        model_transform = stack.pop();//1
		        stack.push(model_transform);//2
		        model_transform = mult(model_transform, translation(0, 0, 5));
		        model_transform = mult(model_transform, translation(9.5 * i, -3.5, 7 * j));
		        model_transform = mult(model_transform, scale(1, 5, 1));
		        this.m_cube.draw(this.graphicsState, model_transform, wood); // wood color
		    }
		}
    //winner
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, 7, -5));
    //head
		stack.push(model_transform);//2
		model_transform = mult(model_transform, scale(2, 2, 2));
		stack.push(model_transform);//3
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //chest
		model_transform = stack.pop();//2
		model_transform = mult(model_transform, translation(0, -2.5, 0));
		stack.push(model_transform);//3
		model_transform = mult(model_transform, scale(1, 1.5, 1));
		this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
    //arms
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//2
		    stack.push(model_transform);//3
		    model_transform = mult(model_transform, translation(1 * i, 0.75, 0));
		    model_transform = mult(model_transform, rotation(-(this.graphicsState.animation_time - 80000) / 120, 1, 0, 0))
		    model_transform = mult(model_transform, rotation(30, 1, 0, 0));
		    model_transform = mult(model_transform, rotation(-10 * i, 0, 1, 0));
		    stack.push(model_transform);//4
		    model_transform = mult(model_transform, translation(0, 0, 0.75));
		    model_transform = mult(model_transform, scale(0.2, 0.2, 0.75));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		    model_transform = stack.pop();//3
		    model_transform = mult(model_transform, translation(0, 0, 2.25));
		    model_transform = mult(model_transform, scale(0.2, 0.2, 0.75));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		}
    //legs
		model_transform = stack.pop();//2
		model_transform = mult(model_transform, translation(0, -1.5, 0));
		stack.push(model_transform);//3
		for (var i = -1; i < 2; i += 2) {
		    model_transform = stack.pop();//2
		    stack.push(model_transform);//3
		    model_transform = mult(model_transform, translation(0.5 * i, 0, 0));
		    model_transform = mult(model_transform, translation(0, -0.5, 0));
		    model_transform = mult(model_transform, scale(0.3, 0.75, 0.3));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		    model_transform = mult(model_transform, translation(0, -0.75, 0));
		    model_transform = mult(model_transform, translation(0, -1, 0));
		    model_transform = mult(model_transform, scale(1, 1, 1));
		    this.m_sphere.draw(this.graphicsState, model_transform, redPlastic);
		}
		model_transform = stack.pop();//2
		model_transform = stack.pop();//1
		model_transform = mult(model_transform, translation(0, -15, 0));
		model_transform = mult(model_transform, scale(1000, 0.01, 1000));
		this.m_cube.draw(this.graphicsState, model_transform, beige); //beige
		model_transform = stack.pop();//0
		model_transform = mult(model_transform, scale(500, 500, 500));
		this.m_sphere.draw(this.graphicsState, model_transform, beige); //beige


    //camera
		var eyePoint = vec4(0, 0, 0, 1) // center of rotation goes here
		eyePoint = mult_vec(translation(0, 10, 50), eyePoint);
		eyePoint = mult_vec(rotation(this.graphicsState.animation_time / 30, 0, 1, 0), eyePoint);
		var eyePoint2 = vec4(0, 20000, 0, 1) // center of rotation goes here
		eyePoint2 = mult_vec(translation(0, 20, 30), eyePoint2);
		eyePoint2 = mult_vec(rotation((this.graphicsState.animation_time - 35000) / 30, 0, 1, 0), eyePoint2);
		var eyePoint3 = vec4(0, 30000, 0, 1) // center of rotation goes here
		eyePoint3 = mult_vec(translation(25, 10, 50), eyePoint3);
		var aim3 = vec4(0, 30000, 0, 1) // center of rotation goes here
		aim3 = mult_vec(translation(-1, -0.25, 1.5), aim3);
		aim3 = mult_vec(translation((this.graphicsState.animation_time - 45000) / 200, 0, 0), aim3);
		var eyePoint4 = vec4(0, 40000, 0, 1) // center of rotation goes here
		eyePoint4 = mult_vec(translation(25, 10, 50), eyePoint4);
		var aim4 = vec4(0, 40000, 0, 1) // center of rotation goes here
		aim4 = mult_vec(translation(-1.5, -0.05, 1.2), aim4);
		aim4 = mult_vec(translation((this.graphicsState.animation_time - 55000) / 200, 0, 0), aim4);
		var eyePoint5 = vec4(0, 50000, 0, 1) // center of rotation goes here
		eyePoint5 = mult_vec(translation(0, 10, 50), eyePoint5);
		var eyePoint6 = vec4(0, 60000, 0, 1) // center of rotation goes here
		eyePoint6 = mult_vec(translation(0, 10, 50), eyePoint6);
		eyePoint6 = mult_vec(rotation((this.graphicsState.animation_time - 80000) / 30, 0, 1, 0), eyePoint6);
		if (this.graphicsState.animation_time < 10000)
		    this.graphicsState.camera_transform = lookAt(vec3(eyePoint[0], eyePoint[1], eyePoint[2]), vec3(0, 0, 0), vec3(0, 1, 0));
		else if (this.graphicsState.animation_time < 35000)
		    this.graphicsState.camera_transform = lookAt(vec3(0, 10000, 100), vec3(0, 10000, 0), vec3(0, 1, 0));
		else if (this.graphicsState.animation_time < 45000)
		    this.graphicsState.camera_transform = lookAt(vec3(eyePoint2[0], eyePoint2[1], eyePoint2[2]), vec3(0, 20000, 0), vec3(0, 1, 0));
		else if (this.graphicsState.animation_time < 55000)
		    this.graphicsState.camera_transform = lookAt(vec3(eyePoint3[0], eyePoint3[1], eyePoint3[2]), vec3(aim3[0], aim3[1], aim3[2]), vec3(0, 1, 0));
		else if (this.graphicsState.animation_time < 70000)
		    this.graphicsState.camera_transform = lookAt(vec3(eyePoint4[0], eyePoint4[1], eyePoint4[2]), vec3(aim4[0], aim4[1], aim4[2]), vec3(0, 1, 0));
		else if (this.graphicsState.animation_time < 80000)
		    this.graphicsState.camera_transform = lookAt(vec3(eyePoint5[0], eyePoint5[1], eyePoint5[2]), vec3(0, 50000, 0), vec3(0, 1, 0));
		else if (this.graphicsState.animation_time < 90000)
		    this.graphicsState.camera_transform = lookAt(vec3(eyePoint6[0], eyePoint6[1], eyePoint6[2]), vec3(0, 60000, 0), vec3(0, 1, 0));
		else if (this.graphicsState.animation_time < 100000)
		    this.graphicsState.camera_transform = lookAt(vec3(0, 7010, 30), vec3(0, 70000, 0), vec3(0, 1, 0));
	}	



Animation.prototype.update_strings = function( debug_screen_strings )		// Strings this particular class contributes to the UI
{
	debug_screen_strings.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_strings.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_strings.string_map["thrust"] = "Thrust: " + thrust;
}