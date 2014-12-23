// - m.graph.js ---------------------------------------------------------- //

/* [+]
 * 
 * This part of the module implements the scene graph functionality
 * for M.GRL.  This provides a simple means of instancing 2D and 3D
 * art assets, greatly simplifies rendering code, and prerforms
 * rendering optimizations to have better performance than would be
 * achieved with by rendering manually.
 * 
 * Additionally, a mechanism for data binding exists on most of the
 * properties of graph objects.  For example, you could set the
 * object's "x" coordinate to be a value like "10", or you could set
 * it to be a function that returns a numerical value like "10".  This
 * can be used to perform animation tasks.  When a function is
 * assigned to a property in such a fashion, it is called a "driver
 * function".
 *
 * Note that, being a scene graph, objects can be parented to other
 * objects.  When the parent moves, the child moves with it!  Empty
 * graph objects can be used to influence objects that draw.  Between
 * empties, inheritance, and driver functions, you are given the tools
 * to implement animations without requiring vertex deformation.
 *
 * Camera objects have a mechanism similar to driver functions,
 * wherein they can either take a coordinate tripple [1,2,3], a
 * function that returns a coordinate tripple, or a graph object.
 *
 * ```
 * // A scene graph instance
 * var scene_graph = new please.SceneGraph();
 *
 * // A drawable graph node.  You can instance gani and image files, too!
 * var character_model = please.access("alice.jta").instance();
 * character_model.rotate_z = function () { return performance.now()/500; };
 * 
 * // The focal point of the camera
 * var camera_target = new please.GraphNode();
 * camera_target.z = 2;
 * 
 * // An empty that has the previous two graph nodes as its children
 * // The game logic would move this node.
 * var character_base = new please.GraphNode();
 *
 * // Populate the graph
 * scene_graph.add(character_base);
 * character_base.add(character_model);
 * character_base.add(camera_target);
 *
 * // Add a camera object that automatically points at particular
 * // graph node.
 * var camera = new please.CameraNode();
 * graph.add(camera);
 * camera.look_at = camera_target;
 * camera.x = 10;
 * camera.y = -10;
 * camera.z = 10;
 * scene_graph.camera = camera; // this will not be needed in the future
 *
 * // Register a render pass with the scheduler (see m.multipass.js)
 * please.pipeline.add(10, "graph_demo/draw", function () {
 *    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
 *
 *    // this line needs to be called once per frame, before drawing.
 *    scene_graph.tick();
 *
 *    // this line may be called repeatedly to draw the current
 *    // snapshot of the graph multiple times the same way.
 *    scene_graph.draw();
 *
 * });
 *
 * // Register a second render pass that will also draw the scene_graph
 * please.pipeline.add(20, "graph_demo/fancy", function () {
 *
 *    // .tick() will have been called by the previous pipeline stage,
 *    // so you shouldn't call it again.  You can, however, call
 *    // .draw() as many times as you like per frame.  Both of these
 *    // pipeline stages are in the same "frame".  You can take
 *    // advantage of this to do post processing effects with the
 *    // stencil buffer, shaders, and/or indirect rendering targets!
 *
 *    scene_graph.draw();
 *
 * });
 *
 * // Start the render loop
 * please.pipeline.start();
 * ```
 */


// [+] please.make_animatable(object, property_name[, default_value])
//
// Sets up the machinery needed to make the given property on an
// object animatable.
//
please.make_animatable = function(obj, prop, default_value) {

    // Create the __ani_cache object if none exists.  Cache is reset every
    // tick, and is generated on the first get.
    if (!obj.__ani_cache) {
        Object.defineProperty(obj, "__ani_cache", {
            enumerable : false,
            writable : false,
            value : {},
        });
    }
    if (!obj.__clear_ani_cache) {
        Object.defineProperty(obj, "__clear_ani_cache", {
            enumerable : false,
            writable : false,
            value : function () {
                for (var key in obj.__ani_cache) {
                    obj.__ani_cache[key] = null;
                };
            },
        });
    }
    var cache = obj.__ani_cache;
    var local = default_value !== undefined ? default_value : null;

    // Add the property to the cache object.
    Object.defineProperty(cache, prop, {
        enumerable: true,
        writable: true,
        value: null,
    });

    // Define the getters and setters for the new property.
    Object.defineProperty(obj, prop, {
        enumerable: true,
        get : function () {
            if (typeof(local) === "function") {
                if (cache[prop] === null) {
                    cache[prop] = local();
                }
                return cache[prop];
            }
            else {
                return local;
            }
        },
        set : function (value) {
            cache[prop] = null;
            local = value;
        },
    });
};


// [+] please.GraphNode()
//
// Constructor function that creates an Empty node.  The constructor
// accepts no arguments, but the created object may be configrued by
// adjusting its properties.  All properties that would have a
// numerical value normally set to them may also be set as a function
// (called a "driver") that returns a numerical value.  When the scene
// graph's ".tick" method is called, the driver functions are
// evaluated, and their results are cached for use by the scene
// graph's .draw() method.
//
// ```
// var empty = new please.GraphNode();
// var empty.rotate_x = 10;
// var empty.rotate_x = fuction() { return performance.now()/500; };
// ```
//
// Most of the time when you want to draw something with the scene
// graph, you create the GraphNodes indirectly from loaded game
// assets.
//
// ```
// var character = please.access("alice.jta").instance();
// var sprite_animation = please.access("particle.gani").instance();
// var just_a_quad = please.access("hello_world.png").instance();
// ```
//
// GraphNodes have some special properties:
//
//  - **x**, **y**, **z** Used to generate the node's local matrix.
//
//  - **rotate_x**, **rotate_y**, **rotate_z** Used to generate the
//    node's local matrix.
//  
//  - **scale_x**, **scale_y**, **scale_z** Used to generate the
//    node's local matrix.
//
//  - **alpha** A numerical value between 0.0 and 1.0.  If sort_mode
//    is set to "alpha", then this indicates alpha belnding value to
//    be used by the GLSL shader, as accessible by the "alpha" uniform
//    variable.  Defaults to 1.0.
//
//  - **visible** Defaults to true.  May be set to false to prevent
//    the node and its children from being drawn.
//
//  - **sort_mode** Defaults to "solid", but may be set to "alpha" to
//    force the object to use the z-sorting path instead of state
//    sorting.  This is generally slower, but is needed if for partial
//    transparency from a texture to work correctly.
//
//  - **draw_type** .jta model instances and empty GraphNodes default
//    to "model", while .gani and image instances default to "sprite".
//    Determines the value of the glsl uniform variable
//    "is_transparent".
//
// Additionally, each GraphNode has several objects used to set GLSL
// variables:
//
//  - **vars** - The property names on the *vars* object correspond to
//    uniform variables on the shader program, and will be set
//    automatically.  The infrastructure that does this automatically
//    prevents redundant state change calls so do not worry about
//    that.  The properties on the vars object may have driver methods
//    assigned to them.
//
//  - **ext** - Works exactly like vars, except it doesn't do anything
//    to the GL state.  Useful for storing custom data that might be
//    referenced elsewhere.
//
//  - **samplers** - The property names of the *samplers* object
//    correspond to the sampler variables on the shader program, and
//    will be set automatically.  You simply assign them the uri of an
//    image asset that was loaded by m.media's machinery, and you are
//    good to go!  M.GRL will take care of texture uploading
//    automatically.  This object also accepts driver methods.
//
// Graph nodes have the following properties pertaining to object
// inhertiance:
//
//  - **children** This is a list of all objects that are directly
//    parented to a given GraphNode instance.
//
// GraphNodes also have the following methods for managing the scene
// graph:
//
//  - **has\_child(entity)** Returns true or false whether or not this
//    node claims argument 'entity' as child.
//
//  - **add(entity)** Adds the passed object as a child.
//
//  - **remove(entity)** Remove the given entity from this node's
//    children.
//
// If you want to create your own special GraphNodes, be sure to set
// the following variables in your constructor to ensure they are
// unique to each instance.
//
// ```
// var FancyNode = function () {
//     please.GraphNode.call(this);
// };
// FancyNode.prototype = Object.create(please.GraphNode.prototype);
// ```
//
// If you want to make an Empty or a derived constructor drawable, set
// the "__drawable" property to true, and set the "draw" property to a
// function that contains your custom drawing code.  Optionally, the
// "bind" property may also be set to a function.  Bind is called
// before Draw, and is used to set up GL state.  Bind is called
// regardless of if the node is visible, though both bind and draw
// requrie the node be drawable.  The bind method is essentially
// vestigial and should not be used.
// 
please.GraphNode = function () {
    console.assert(this !== window);

    this.children = [];
    this.visible = true;
    this.ext = {};
    this.vars = {};
    this.samplers = {};

    ANI("x", 0);
    ANI("y", 0);
    ANI("z", 0);

    ANI("rotate_x", 0);
    ANI("rotate_y", 0);
    ANI("rotate_z", 0);

    ANI("scale_x", 0);
    ANI("scale_y", 0);
    ANI("scale_z", 0);

    ANI("alpha", 1.0);

    this.__cache = null;
    this.__asset = null;
    this.__asset_hint = "";
    this.__graph_root = null;
    this.draw_type = "model"; // can be set to "sprite"
    this.sort_mode = "solid"; // can be set to "alpha"
    this.__is_camera = false; // set to true if the object is a camera
    this.__drawable = false; // set to true to call .bind and .draw functions
    this.__unlink = false; // set to true to tell parents to remove this child
};
please.GraphNode.prototype = {
    "has_child" : function (entity) {
        // Return true or false whether or not this graph node claims
        // the given entity as a child.
        return this.children.indexOf[entity] !== -1;
    },
    "add" : function (entity) {
        // Add the given entity to this object's children.
        this.children.push(entity);
        entity.__set_graph_root(this.__graph_root)
    },
    "remove" : function (entity) {
        //  Remove the given entity from this object's children.
        if (this.has_child(entity)) {
            this.children.splice(this.children.indexOf(entity),1);
        }
    },
    "__set_graph_root" : function (root) {
        // Used to recursively set the "graph root" (scene graph
        // object) for all children of this object.
        this.__graph_root = root;
        for (var i=0; i<this.children.length; i+=1) {
            this.children[i].__set_graph_root(root);
        }
    },
    "__flatten" : function () {
        // return the list of all decendents to this object;
        var found = [];
        if (this.visible) {
            for (var i=0; i<this.children.length; i+=1) {
                var child = this.children[i];
                if (child.__unlink) {
                    this.remove(child);
                    continue;
                }
                var tmp = child.__flatten();
                found.push(child);
                found = found.concat(tmp);
            }
        }
        return found;
    },
    "__hoist" : function (parent_matrix, cache) {
        // This recalculates the world and normal matrices for each
        // element in the tree, and also copies other cache entries
        // for uniforms and samplers from parent to child if the child
        // does not define its own.

        if (cache) {
            // copy uniforms into child
            ITER_PROPS(uniform_name, cache.uniforms) {
                if (!this.__cache.uniforms.hasOwnProperty(uniform_name)) {
                    this.__cache.uniforms[uniform_name] = cache.uniforms[uniform_name];
                }
            }
            // copy samplers into child
            ITER_PROPS(sampler_name, cache.sampler) {
                if (!this.__cache.samplers.hasOwnProperty(sampler_name)) {
                    this.__cache.samplers[sampler_name] = cache.samplers[sampler_name];
                }
            }
        }

        // generate this entity's world matrix
        this.__cache.world_matrix = mat4.create();
        var local_matrix = mat4.create();
        mat4.translate(local_matrix, local_matrix, this.__cache.xyz);
        mat4.rotateX(local_matrix, local_matrix, this.__cache.rotate[0]);
        mat4.rotateY(local_matrix, local_matrix, this.__cache.rotate[1]);
        mat4.rotateZ(local_matrix, local_matrix, this.__cache.rotate[2]);
        mat4.scale(local_matrix, local_matrix, this.__cache.scale);
        mat4.multiply(
            this.__cache.world_matrix, parent_matrix, local_matrix);
        for (var i=0; i<this.children.length; i+=1) {
            this.children[i].__hoist(this.__cache.world_matrix, this.__cache);
        }

        // generate this entity's normal matrix
        if (this.__drawable) {
            var normal_matrix = mat3.create();
            mat3.fromMat4(normal_matrix, this.__cache.world_matrix);
            mat3.invert(normal_matrix, normal_matrix);
            mat3.transpose(normal_matrix, normal_matrix);
            this.__cache.normal_matrix = normal_matrix;
        }
    },
    "__z_sort_prep" : function (screen_matrix) {
        var matrix = mat4.multiply(
            mat4.create(), screen_matrix, this.__cache.world_matrix);
        var position = vec3.transformMat4(vec3.create(), this.__cache.xyz, matrix);
        // I guess we want the Y and not the Z value?
        this.__cache.final_depth = position[1];
        
    },
    "__rig" : function () {
        // cache the values of this object's driver functions.
        var self = this;
        this.__cache = {
            "uniforms" : {},
            "samplers" : {},
            "xyz" : null,
            "rotate" : null,
            "scale" : null,
            "world_matrix" : null,
            "normal_matrix" : null,
            "final_transform" : null,
            "final_depth" : 0,
        };

        this.__cache.xyz = vec3.fromValues(
            this.x, this.y, this.z);

        this.__cache.rotate = vec3.fromValues(
            this.rotate_x, this.rotate_y, this.rotate_z);

        this.__cache.scale = vec3.fromValues(
            this.scale_x,
            this.scale_y,
            this.scale_z);
        
        please.prop_map(self.ext, function (name, value) {
            DRIVER(self, value);
        });
        please.prop_map(self.vars, function (name, value) {
            self.__cache["uniforms"][name] = DRIVER(self, value);
        });
        please.prop_map(self.samplers, function (name, value) {
            self.__cache["samplers"][name] = DRIVER(self, value);
        });
    },
    "__bind" : function (prog) {
        // calls this.bind if applicable.
        if (this.__drawable && typeof(this.bind) === "function") {
            this.bind();
        }
    },
    "__draw" : function (prog) {
        // bind uniforms and textures, then call this.draw, if
        // applicable.  The binding code is set up to ignore redundant
        // binds, so as long as the calls are sorted, this extra
        // overhead should be insignificant.
        var self = this;
        if (this.visible && this.__drawable && typeof(this.draw) === "function") {
            ITER_PROPS(name, self.__cache.uniforms) {
                prog.vars[name] = self.__cache.uniforms[name];
            }
            ITER_PROPS(name, self.__cache.samplers) {
                prog.samplers[name] = self.__cache.samplers[name];
            }
            prog.vars["world_matrix"] = self.__cache.world_matrix;
            prog.vars["normal_matrix"] = self.__cache.normal_matrix;

            // FIXME: these should both be bools
            prog.vars["is_sprite"] = self.draw_type==="sprite";
            prog.vars["is_transparent"] = self.sort_mode==="alpha";

            if (self.sort_mode === "alpha") {
                prog.vars["alpha"] = self.alpha;
            }
            else {
                prog.vars["alpha"] = 1.0;
            }

            this.draw();
        }
    },
    // The bind function is called to set up the object's state.
    // Uniforms and textures are bound automatically.
    "bind" : null,
    // The draw function is called to draw the object.
    "draw" : null,
};


// [+] please.SceneGraph()
//
// Constructor function that creates an instance of the scene graph.
// The constructor accepts no arguments.  To render, the **camera**
// property must be set to a camera object.  Currently this is limited
// to please.PerspectiveCamera, though other types will be available
// in the future.
//
// The **.tick()** method on SceneGraph instances is called once per
// frame (multiple render passes may occur per frame), and is
// responsible for determining the world matricies for each object in
// the graph, caching the newest values of driver functions, and
// performs state sorting.
//
// The **.draw()** method is responsible for invoking the .draw()
// methods of all of the nodes in the graph.  State sorted nodes will
// be invoked in the order determined by .tick, though the z-sorted
// nodes will need to be sorted on every draw call.  This method may
// called as many times as you like per frame.  Normally the usage of
// this will look something like the following example:
//
// ```
// please.pipeline.add(10, "graph_demo/draw", function () {
//    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//    scene_graph.tick();
//    scene_graph.draw();
// });
// ```
//
please.SceneGraph = function () {
    please.GraphNode.call(this);

    this.__rig = null;
    this.__bind = null;
    this.__draw = null;
    this.__flat = [];
    this.__alpha = [];
    this.__states = {};
    this.__graph_root = this;
    this.camera = null;
    this.local_matrix = mat4.create();

    var z_sort_function = function (lhs, rhs) {
        return rhs.__cache.final_depth - lhs.__cache.final_depth;
    };

    this.tick = function () {
        if (this.camera === null) {
            // if no camera was set, loop through the immediate
            // children of this object and select the first camera
            // available
            for (var i=0; i<this.children.length; i+=1) {
                var child = this.children[i];
                if (child.__is_camera) {
                    child.activate();
                    break;
                }
            }
        }
        else {
            // kind of a hack, since the camera doesn't strictly need
            // to be a child of the graph node
            this.camera.__clear_ani_cache();
        }

        // flatten the scene graph into a list (this line will soon
        // not be needed)
        this.__flat = this.__flatten();

        // reset the cache on graph objects
        ITER(i, this.__flat) {
            var element = this.__flat[i];
            element.__clear_ani_cache();
        };

        // nodes in the z-sorting path
        this.__alpha = [];

        // nodes in the state-sorting path
        this.__states = {};

        // run through the flattened list of nodes, calculate world
        // matricies, and put things in applicable sorting paths
        ITER(i, this.__flat) {
            var element = this.__flat[i];
            element.__rig(); // reset the non-ani cache
            if (element.__drawable) {
                if (element.sort_mode === "alpha") {
                    this.__alpha.push(element);
                }
                else {
                    var hint = element.__asset_hint ? element.__asset_hint : "uknown_asset";
                    if (!this.__states[hint]) {
                        this.__states[hint] = [];
                    }
                    this.__states[hint].push(element);
                }
            }
            if (this.camera === null && element.__is_camera) {
                // if there is still no camera, just pick the first
                // thing found :P
                element.activate();
            }
        };

        // update the matricies of objects in the tree
        ITER(i, this.children) {
            var child = this.children[i];
            child.__hoist(this.local_matrix);
        }
    };

    this.draw = function () {
        var prog = please.gl.get_program();
        if (this.camera) {
            this.camera.update_camera();
            prog.vars.projection_matrix = this.camera.projection_matrix;
            prog.vars.view_matrix = this.camera.view_matrix;
        }
        else {
            throw ("The scene graph has no camera in it!");
        }
        if (this.__states) {
            ITER_PROPS(hint, this.__states) {
                var children = this.__states[hint];
                ITER(i, children) {
                    var child = children[i];
                    child.__bind(prog);
                    child.__draw(prog);
                }
            }
        }
        if (this.__alpha) {
            // sort the transparent items by z
            var screen_matrix = mat4.multiply(
                mat4.create(), 
                this.camera.projection_matrix,
                this.camera.view_matrix);
            ITER(i, this.__alpha) {
                var child = this.__alpha[i];
                child.__z_sort_prep(screen_matrix);
            };
            this.__alpha.sort(z_sort_function);

            // draw translucent elements
            ITER(i, this.__alpha) {
                var child = this.__alpha[i];
                child.__bind(prog);
                child.__draw(prog);
            }
        }
    };
};
please.SceneGraph.prototype = Object.create(please.GraphNode.prototype);


// [+] please.CameraNode()
//
// Constructor function that creates a camera object to be put in the
// scene graph.  Camera nodes support both orthographic and
// perspective projection, and almost all of their properties are
// animatable.  The view matrix can be generated in one of two ways
// described below.
//
// To make a camera active, call it's "activate()" method.  If no
// camera was explicitly activated, then the scene graph will call the
// first one added that is an immediate child, and if no such camera
// still exists, then it will pick the first one it can find durring
// state sorting.
//
// The default way in which the view matrix is calculated uses the
// mat4.lookAt method from the glMatrix library.  The following
// properties provide the arguments for the library call.  Note that
// the location argument is missing - this is because the CameraNode's
// scene graph coordinates are used instead.
//
//  - **look_at** A vector of 3 values (defaults to [0, 0, 0]), null,
//    or another GraphNode.  This is the coordinate where the camera
//    is pointed at.  If this is set to null, then the CameraNode's
//    calculated world matrix is used as the view matrix.
//
//  - **up_vector** A normal vector of 3 values, indicating which way
//    is up (defaults to [0, 0, 1]).  If set to null, [0, 0, 1] will
//    be used instead
//
// If the look_at property is set to null, the node's world matrix as
// generated be the scene graph will be used as the view matrix
// instead.
//
// One can change between orthographic and perspective projection by
// calling one of the following methods:
//
//  - **set_perspective()**
//
//  - **set_orthographic()**
//
// The following property influences how the projection matrix is
// generated when the camera is in perspective mode (default
// behavior).
//
//  - **fov** Field of view, defined in degrees.  Defaults to 45.
//
// The following properties influence how the projection matrix is
// generated when the camera is in orthographic mode.  When any of
// these are set to 'null' (default behavior), the bottom left corner
// is (0, 0), and the top right is (canvas_width, canvas_height).
//
//  - **left**
//
//  - **right**
//
//  - **bottom**
//
//  - **up**
//
// The following properties influence how the projection matrix is
// generated, and are common to both orthographic and perspective
// mode:
// 
//  - **width** Defaults to null, which indicates to use the rendering
//    canvas's width instead.  For perspective rendering, width and
//    height are used to calculate the screen ratio.  Orthographic
//    rendering uses these to calculate the top right coordinate.
//
//  - **height** Defaults to null, which indicates to use the rendering
//    canvas's height instead.  For perspective rendering, width and
//    height are used to calculate the screen ratio.  Orthographic
//    rendering uses these to calculate the top right coordinate.
//
//  - **near** Defaults to 0.1
//
//  - **far** Defaults to 100.0
//
please.CameraNode = function () {
    please.GraphNode.call(this);
    this.__is_camera = true;

    this.look_at = vec3.fromValues(0, 0, 0);
    this.up_vector = vec3.fromValues(0, 0, 1);

    ANI("fov", 45);

    ANI("left", null);
    ANI("right", null);
    ANI("bottom", null);
    ANI("top", null);

    ANI("width", null);
    ANI("height", null);
    
    ANI("near", 0.1);
    ANI("far", 100.0);

    this.__last = {
        "fov" : null,
        "left" : null,
        "right" : null,
        "bottom" : null,
        "top" : null,
        "width" : null,
        "height" : null,
    };

    this.projection_matrix = mat4.create();
    this.view_matrix = mat4.create();
    this.__projection_mode = "perspective";
};
please.CameraNode.prototype = Object.create(please.GraphNode.prototype);


please.CameraNode.prototype.activate = function () {
    var graph = this.__graph_root;
    if (graph !== null) {
        if (graph.camera && typeof(graph.camera.on_inactive) === "function") {
            graph.camera.on_inactive();
        }
        graph.camera = this;
    }
};


please.CameraNode.prototype.on_inactive = function () {
};


please.CameraNode.prototype.set_perspective = function() {
    this.__projection_mode = "perspective";
};


please.CameraNode.prototype.set_orthographic = function() {
    this.__projection_mode = "orthographic";
};


please.CameraNode.prototype.update_camera = function () {
    // Calculate the arguments common to both projection functions.
    var near = this.near;
    var far = this.far;
    var width = this.width;
    var height = this.height;
    if (width === null) {
        width = please.gl.canvas.width;
    }
    if (height === null) {
        height = please.gl.canvas.height;
    }

    // Determine if the common args have changed.
    var dirty = false;
    if (far !== this.__last.far ||
        near !== this.__last.near ||
        width !== this.__last.width ||
        height !== this.__last.height) {

        dirty = true;
        this.__last.far = far;
        this.__last.near = near;
        this.__last.width = width;
        this.__last.height = height;
    }

    // Perspective projection specific code
    if (this.__projection_mode == "perspective") {
        var fov = this.fov;

        if (fov !== this.__last.fov || dirty) {
            this.__last.fov = fov;
            
            // Recalculate the projection matrix and flag it as dirty
            mat4.perspective(
                this.projection_matrix, please.radians(fov),
                width / height, near, far);
            this.projection_matrix.dirty = true;
        }
    }

    // Orthographic projection specific code
    else if (this.__projection_mode == "orthographic") {
        var left = this.left;
        var right = this.right;
        var bottom = this.bottom;
        var top = this.top;

        if (left === null || right === null ||
            bottom === null || top === null) {

            // If any of the orthographic args are unset, provide our
            // own defaults based on the canvas element's dimensions.
            left = 0;
            right = width;
            bottom = 0;
            top = height;
        }

        if (left !== this.__last.left ||
            right !== this.__last.right ||
            bottom !== this.__last.bottom ||
            top !== this.__last.top ||
            dirty) {

            this.__last.left = left;
            this.__last.right = right;
            this.__last.bottom = bottom;
            this.__last.top = top;

            // Recalculate the projection matrix and flag it as dirty
            mat4.ortho(
                this.projection_matrix, left, right, bottom, top, near, far);
            this.projection_matrix.dirty = true;
        }
    }

    // If the node is not in the graph, trigger its own __rig and __hoist methods.
    if (this.__graph_root === null) {
        this.__rig();
        this.__hoist(mat4.create(),{});
    }
    
    // Now to update the view matrix, if necessary.
    var location = this.__cache.xyz;
    var look_at = DRIVER(this, this.look_at);
    var up_vector = DRIVER(this, this.up_vector);

    if (look_at.__cache && look_at.__cache.xyz) {
        look_at = look_at.__cache.xyz;
    }
    if (up_vector.__cache && up_vector.__cache.xyz) {
        up_vector = up_vector.__cache.xyz;
    }

    if (look_at !== null) {
        // View matrix uses the mat4.lookAt method.
        if (up_vector === null) {
            up_vector = vec3.fromValues(0, 0, 1);
        }
        mat4.lookAt(
            this.view_matrix,
            location,
            look_at,
            up_vector);
        this.view_matrix.dirty = true;
    }
    else {
        // View matrix is determined by camera's world matrix...?
        this.view_matrix = this.__cache.world_matrix;
        this.view_matrix.dirty = true;
    }
};
