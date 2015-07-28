// - m.overlays.js ---------------------------------------------------------- //


// namespace
please.overlay = {
    "__bindings" : [],
};


//
please.__create_canvas_overlay = function () {
    var canvas = please.gl.canvas;
    if (!canvas.overlay) {
        var overlay = canvas.overlay = document.createElement("div");
        overlay.id="mgrl_overlay";
        overlay.style.zIndex = 1000;
        overlay.style.position = "absolute";
        overlay.style.pointerEvents = "none";
        document.body.appendChild(canvas.overlay);
        please.__align_canvas_overlay();
    }
};


//
please.__align_canvas_overlay = function () {
    var canvas = please.gl.canvas;
    var overlay = canvas.overlay;
    var rect = canvas.getBoundingClientRect();
    overlay.style.top = rect.top + "px";
    overlay.style.left = rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
};


// creates and returns a new overlay child div
please.overlay.new_element = function (id, classes) {
    var el = document.createElement("div");
    please.gl.canvas.overlay.appendChild(el);
    el.style.position = "absolute";
    if (id) {
        el.id = id;
    }
    if (classes) {
        if (typeof(classes) === "string") {
            el.className = classes;
        }
        else {
            el.className = classes.join(" ");
        }
    }

    el.__graph_node = null;
    el.bind_to_node = function (node) {
        el.__graph_node = node;
        please.overlay.__bindings.push(this);
    };
    
    return el;
};


// removes all overlay children of a given id
please.overlay.remove_element_of_id = function (id) {
    var overlay = please.gl.canvas.overlay;
    var found = document.getElementById(id);
    if (found) {
        try {
            overlay.removeChild(found);
        } catch (err) {}
    }
};


// removes all overlay children of a given class name
please.overlay.remove_element_of_class = function (class_name) {
    var overlay = please.gl.canvas.overlay;
    var found = overlay.getElementsByClassName(class_name);
    DECR(i, found) {
        overlay.removeChild(found[i]);
    }
};


//
please.pipeline.add(-1, "mgrl/overlay_sync", function () {
    var matrices = {};
    ITER(i, please.overlay.__bindings) {
        var element = please.overlay.__bindings[i];
        var node = element.__graph_node;
        var graph = node.graph_root;
        if (graph) {
            var screen_matrix, matrix;
            if (matrices[graph.__id] === undefined) {
                screen_matrix = mat4.create();
                mat4.multiply(
                    screen_matrix,
                    graph.camera.projection_matrix,
                    graph.camera.view_matrix);
                matrices[graph.__id] = screen_matrix;
            }
            else {
                screen_matrix = matrices[graph.__id];
            }
            matrix = mat4.multiply(
                mat4.create(), screen_matrix, node.shader.world_matrix);
            var position = vec3.transformMat4(vec3.create(), node.location, matrix);
            element.style.left = position[0] + "px";
            element.style.top = position[1] + "px";
        }
    }
}).skip_when(function () { return please.overlay.__bindings.length === 0; });