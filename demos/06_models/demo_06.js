"use strict";
/*

 Midnight Graphics & Recreation Library Demos:

 This file is the old model loader demo, and will soon be superseeded.
.

 The javascript source code demos provided with M.GRL have been
 dedicated to the by way of CC0.  More information about CC0 is
 available here: https://creativecommons.org/publicdomain/zero/1.0/
.

 Art assets used are under a Creative Commons Attribution - Share
 Alike license or similar (this is explained in detail elsewhere).
 M.GRL itself is made available to you under the LGPL.  M.GRL makes
 use of the glMatrix library, which is some variety of BSD license.
.

 Have a nice day! ^_^

 */


addEventListener("load", function() {
    // create the rendering context
    please.gl.set_context("gl_canvas");

    // setup opengl state    
    gl.enable(gl.CULL_FACE);

    // setup asset search paths
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");
    
    // load shader sources
    please.load("simple.vert");
    please.load("simple.frag");

    // load our model files
    please.load("gavroche.jta");
    please.load("floor_lamp.jta");
    
    // test model
    please.load("graph_test.jta");

    // while not strictly necessary, the progress bar will make more
    // sense if we manually queue up textures here:
    please.load("uvmap.png");
    please.load("floor_lamp.png");
    please.load("mr_squeegee_feet.jta");
    please.load("anitest2.jta");

    // add a loading screen
    please.set_viewport(new please.LoadingScreen());
});


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Create GL context, build shader pair
    var prog = please.glsl("custom", "simple.vert", "simple.frag");
    prog.activate();

    // Create the renderer
    var renderer = window.renderer = new please.RenderNode("custom");
    renderer.clear_color = [0.0, 0.0, 0.0, 0.0];
    please.set_viewport(renderer);

    // set up a directional light
    var light_direction = vec3.fromValues(.25, -1.0, -.4);
    vec3.normalize(light_direction, light_direction);
    vec3.scale(light_direction, light_direction, -1);
    renderer.shader.light_direction = light_direction;

    // Create the scene graph
    var graph = window.graph = renderer.graph = new please.SceneGraph();
    
    // access model data
    var gav_model = please.access("gavroche.jta");
    var lamp_model = please.access("floor_lamp.jta");
    var test_model = please.access("mr_squeegee_feet.jta");

    // add a bunch of rotating objects
    var rotatoe = new please.GraphNode();
    var coords = [
        [-5, 0, 0],
        [5, 0, 0],
        [0, -5, 0],
        [0, 5, 0],
    ];
    for (var i=0; i<coords.length; i+=1) {
        var gav;
        if (i < 3) {
            gav = gav_model.instance();
            gav.shader.mode = 2;
            //gav.shader.mode = 3; // mode 2 + translucent
            //gav.sort_mode = "alpha";
            gav.rotation_z = Math.random()*360;
        }
        else {
            gav = window.test_rig = test_model.instance();
            gav.scale = [1.0, 1.0, 1.0];
            gav.propogate(function(node) {
                node.shader.mode = 2; // indicate this is not the floor
            });
            gav.rotation_z = please.repeating_driver(360, 0, 5000);
            gav.actions.shitty_walk.repeat = true;
            gav.play("shitty_walk");
        }
        gav.location = coords[i];
        rotatoe.add(gav);
    }
    rotatoe.rotation_z = function () {
        var progress = performance.now()/110;
        return progress*-1;
    };
    var center = window.test = lamp_model.instance();
    center.shader.mode = 2;
    rotatoe.add(center);
    graph.add(rotatoe);

    // add row of lamps in the background
    var spacing = 5;
    var count = 4;
    var end = count*spacing;
    var start = end*-1;
    var y = -20;
    for (var x=start; x<=end; x+=spacing) {
        var lamp = lamp_model.instance();
        lamp.shader.mode = 2;
        lamp.location_x = x;
        lamp.location_y = y;
        lamp.rotation_z = Math.random()*360;
        graph.add(lamp);
    }

    // add a test mode
    var anitest2 = window.anitest2 = please.access("anitest2.jta").instance();
    anitest2.scale = [1.25, 1.25, 1.26];
    graph.add(anitest2);
    anitest2.actions["Wobble"].repeat = true;
    anitest2.play("Wobble");
    
    // add a floor
    graph.add(new FloorNode());

    // add a camera
    var camera = window.camera = new please.CameraNode();
    camera.look_at = vec3.fromValues(0, 0, 1);
    camera.location = [-3, 12.5, 5.7];

    // add the camera to the scene graph
    graph.add(camera);

    // If the camera is not explicitely activated, then the scene
    // graph will attempt to pick one to use.  In this case we have
    // only one so it doesn't matter, BUT it is generally good
    // practice to activate the camera you want to use before drawing.
    camera.activate();
}));


var FloorNode = function () {
    console.assert(this !== window);
    please.GraphNode.call(this);

    this.__vbo = please.gl.make_quad(100, 100);
    this.__drawable = true;
    this.shader.mode = 1; // "floor mode"

    this.bind = function () {
        this.__vbo.bind();
    };
    this.draw = function () {
        this.__vbo.draw();
    };
};
FloorNode.prototype = please.GraphNode.prototype;
