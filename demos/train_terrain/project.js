"use strict";
/*

 Midnight Graphics & Recreation Library Project Template

 This javascript source file has been dedicated to the public domain
 by way of CC0.  More information about CC0 is available here:
 https://creativecommons.org/publicdomain/zero/1.0/ .

 Art assets used are under a Creative Commons Attribution - Share
 Alike license or similar (this is explained in detail elsewhere).

 M.GRL itself is made available to you under the LGPL.

 M.GRL makes use of the glMatrix library, which is some variety of BSD
 license.

 Have a nice day! ^_^

*/


// local namespace
var demo = {
    "viewport" : null, // the render pass that will be rendered
    "manifest" : [
        "hex_tile.jta",
        "gavroche_hall:gavroches.png",
    ],
};


var hex_grid = function(x_count, y_count) {
    var asset = please.access("hex_tile.jta");
    var map = new please.GraphNode();

    var radius_x = 1.0 / Math.cos(please.radians(30));
    var radius_y = 1.0;
    
    var tile_width = (radius_x * 1.5);
    var tile_height = (radius_y * 2.0);
    
    var total_width = (tile_width * x_count) + (radius_x * 0.5);
    var total_height = (tile_height * y_count) + (radius_y * 0.5);
    
    var half_w = total_width/2;
    var half_h = total_height/2;

    for (var x=0; x<x_count; x+=1) {
        var x_offset = (tile_width * x) - half_w + radius_x;
        var y_jitter = radius_y / (x % 2 == 0 ? 4 : -4);
        for (var y=0; y<y_count; y+=1) {
            var y_offset = (tile_height * y) - half_h + radius_y + y_jitter;
            var z_offset = Math.random() - 0.5;
            
            var tile = asset.instance();
            tile.location = [x_offset, y_offset, z_offset];
            tile.shader.diffuse_texture = "gavroche_hall:gavroches.jpg";
            map.add(tile);
        }
    }
    return map;
};


addEventListener("load", function() {
    // Attach the opengl rendering context.  This must be done before
    // anything else.
    please.gl.set_context("gl_canvas");
    
    // Define where m.grl is to find various assets when using the
    // load methed.
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");
    
    // Queue up assets to be downloaded before the game starts.
    demo.manifest.map(please.load);

    // Register a render passes with the scheduler.  The autoscale
    // prefab is used to change the dimensions of the rendering canvas
    // when it has the 'fullscreen' css class, as well as constrain
    // the maximum height of said canvas element.  You are responsible
    // for providing the css needed to upsample the canvas, though
    // this project template accomplishes that for you.  See "ui.css".
    please.pipeline.add_autoscale();

    // register a render pass with the scheduler
    please.pipeline.add(10, "project/draw", function () {
        please.render(demo.viewport);
    }).skip_when(function () { return demo.viewport === null; });

    // start the rendering pipeline
    please.pipeline.start();

    // Show a loading screen
    demo.viewport = new please.LoadingScreen();
});


addEventListener("mgrl_fps", function (event) {
    // This handler is called every so often to report an estimation
    // of the current frame rate, so that it can be displayed to the
    // user.
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // an empty to store our to-be-static objects in
    var builder = new please.GraphNode();

    // make it terrain
    builder.add(hex_grid(100, 100));
    
    // setup the scene graph
    var graph = demo.graph = new please.SceneGraph();
    var camera = demo.camera = new please.CameraNode();
    camera.look_at = [0, -2, 0];
    camera.location = [0, -10, 15];
    
    // experimental aspec ration dependent fov
    camera.fov = function () {
        var rect = please.gl.canvas.getBoundingClientRect();
        return please.degrees(Math.atan2(rect.height, rect.width)) * 1.58;
    };

    // add objects to the graph
    graph.add_static(builder);
    graph.add(camera);
    
    // add a renderer using the default shader
    var renderer = new please.RenderNode("default");
    renderer.clear_color = [.15, .15, .15, 1];
    renderer.graph = graph;

    demo.viewport.raise_curtains(renderer);
}));
