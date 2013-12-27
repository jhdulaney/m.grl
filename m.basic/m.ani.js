// - m.ani.js --------------------------------------------------------------- //


// "gani" media type handler
please.media.search_paths.ani = "";
please.media.handlers.ani = function (url, callback) {
    var req = new XMLHttpRequest();
    please.media._push(req);
    req.onload = function () {
        //please.media.assets[url] = new please.media.__Animation(req.response);
        please.media.assets[url] = new please.media.__AnimationData(req.response);
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("pass", url);});
        }
        please.media._pop(req);
    };
    req.onerror = function () {
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("fail", url);});
        }
        please.media._pop(req);
    };
    req.open('GET', url, true);
    req.responseType = "text";
    req.send();
};


// Function returns Animation Instance object.  AnimationData.create()
// wraps this function, so you don't need to use it directly.
please.media.__AnimationInstance = function (animation_data) {
    var ani = {
        "data" : animation_data,
        "__attrs" : {},
        "sprites" : {},
        "frames" : [],

        // method functions
        "set_attr" : function (attr, value) {},
        "get_attr" : function (attr) {},
        "change_animation" : function (animation_data) {},
        "play" : function () {},

        // event handler
        "on_dirty" : function (ani) {},
        "on_change_reel" : function (ani, new_ani) {},
    };


    // This is used to bind an object's proprety to an "attribute".
    var bind_or_copy = function (object, key, value) {
        if (please.is_attr(value)) {
            var getter = function () {
                return ani.__attrs[value];
            };
            Object.defineProperty(object, key, {"get":getter});
        }
        else {
            object[key] = value;
        }
    };


    // called when the object is created but also if the animation is
    // changed at some point.
    var build_bindings = function () {
        // first, pull in any new defaults:
        for (var prop in ani.data.attrs) {
            if (ani.data.attrs.hasOwnProperty(prop)) {
                var datum = ani.data.attrs[prop];
                if (!ani.__attrs.hasOwnProperty(prop)) {
                    ani.__attrs[prop] = datum;
                }
            }
        }

        // next, copy over sprite defs and do data binding:
        ani.sprites = {};
        for (var sprite_id in ani.data.sprites) {
            var copy_target = ani.data.sprites[sprite_id];
            var sprite = {};
            for (var prop in copy_target) {
                var datum = copy_target[prop];
                bind_or_copy(sprite, prop, datum);
            }
            ani.sprites[sprite_id] = sprite;
        }
        
        // last, copy over the framesets and do data binding:
        ani.frames = [];
        for (var i=0; i<ani.data.frames.length; i+=1) {
            var target_block = ani.data.frames[i];
            var block = [];
            if (target_block.wait !== undefined) {
                bind_or_copy(block, "wait", target_block.wait);
            }
            if (target_block.sound !== undefined) {
                block.sound = {};
                for (var sound_prop in target_block.sound) {
                    var value = target_block.sound[sound_prop];
                    bind_or_copy(block.sound, sound_prop, value);
                }
            }
            for (var k=0; k<target_block.length; k+=1) {
                var keyframe = target_block[k];
                block.push([]); // add keyframe to new block
                for (var s=0; s<keyframe.length; s+=1) {
                    var target_key = keyframe[s];
                    var key = {};
                    for (var key_prop in target_key) {
                        var value = target_key[key_prop];
                        bind_or_copy(key, key_prop, value);
                    }
                    block[k].push(key);
                }
            }
            ani.frames.push(block);
        }
    };

    var start_time = 0;
    var timer = -1;

    ani.play = function () {
        start_time = Date.now();
    };



    
    build_bindings();
    return ani;
};


// Constructor function, parses gani files
please.media.__AnimationData = function (gani_text) {
    var ani = {
        "__raw_data" : gani_text,
        "__resources" : {}, // files that this gani would load, using dict as a set

        "sprites" : {},
        "attrs" : {
            "SPRITES" : "sprites.png",
            "HEAD" : "head19.png",
            "BODY" : "body.png",
            "SWORD" : "sword1.png",
            "SHEILD" : "sheild1.png",
        },
        "frames" : [],
        
        "single_dir" : false,
        "looping" : false,
        "continuous" : false,
        "setback_to" : 0,

        "create" : function () {},
    };

    // the create function returns an AnimationInstance for this
    // animation.
    ani.create = function () {
        return please.media.__AnimationInstance(ani);
    };

    var frames_start = 0;
    var frames_end = 0;
    var defs_phase = true;

    var lines = gani_text.split("\n");
    for (var i=0; i<lines.length; i+=1) {
        var line = lines[i].trim();
        if (line.length == 0) {
            continue;
        }
        var params = please.split_params(line);

        if (defs_phase) {
            // update a sprite definition
            if (params[0] === "SPRITE") {
                var sprite_id = Number(params[1]);
                var sprite = {
                    "hint" : params.slice(7).join(" "),
                };
                var names = ["resource", "x", "y", "w", "h"];
                for (var k=0; k<names.length; k+=1) {
                    var datum = params[k+2];
                    var name = names[k];
                    if (please.is_attr(datum)) {
                        sprite[name] = datum;
                    }
                    else {
                        if (k > 0 && k < 5) {
                            sprite[name] = Number(datum);
                        }
                        else {
                            if (k == 0) {
                                ani.__resources[datum] = true;
                            }
                            sprite[name] = datum;
                        }
                    }
                }
                ani.sprites[sprite_id] = sprite;
            }


            // single direction mode
            if (params[0] === "SINGLEDIRECTION") {
                ani.single_dir = true;
            }

            // continuous mode
            if (params[0] === "CONTINUOUS") {
                ani.continuous = true;
            }

            // setbackto setting
            if (params[0] === "SETBACKTO") {
                ani.continuous = false;
                if (please.is_number(params[1])) {
                    ani.setbackto = Number(parasm[1]);
                }
                else {
                    var next_file = params[1];
                    if (!next_file.endsWith(".gani")) {
                        next_file += ".gani";
                    }
                    ani.setbackto = next_file;
                    ani.__resources[next_file] = true;
                }
            }
            
            // default values for attributes
            if (params[0].startsWith("DEFAULT")) {
                var attr_name = params[0].slice(7);
                var datum = params[1];
                if (please.is_number(params[1])) {
                    datum = Number(datum);
                }
                ani.attrs[attr_name] = datum;
            }

            
            // determine frameset boundaries
            if (params[0] === "ANI") {
                frames_start = i+1;
                defs_phase = false;
            }
        }
        else {
            if (params[0] === "ANIEND") {
                frames_end = i-1;
            }
        }
    }


    // add default attrs that might be file names to the load queue
    var attr_names = please.get_properties(ani.attrs);
    for (var i=0; i<attr_names.length; i+=1) {
        var attr = attr_names[i];
        var datum = ani.attrs[attr];
        if (typeof(datum) !== "number") {
            ani.__resources[datum] = true;
        }
    }

    
    // next up is to parse out the frame data
    var last_frame = -1;
    var new_block = function () {
        last_frame += 1;
        ani.frames.push([]);
    };
    new_block();

    // pdq just to do something interesting with the data - almost
    // certainly implemented wrong
    for (var i=frames_start; i<=frames_end; i+=1) {
        var line = lines[i].trim();
        if (line.length === 0) {
            // whitespace might actually be important
            continue;
        }
        var params = please.split_params(line);
        if (params[0] === "WAIT") {
            ani.frames[last_frame].wait = params;
        }
        else if (params[0] === "PLAYSOUND") {
            var sound_file = params[1];
            if (!please.is_attr(sound_file)) {
                ani.__resources[sound_file] = true;
            }
            ani.frames[last_frame].sound = {
                "file" : sound_file,
                "x" : Number(params[2]),
                "y" : Number(params[3]),
            };
        }
        else if (please.is_number(params[0]) || please.is_attr(params[1])) {
            // line is a frame definition
            if (ani.frames[last_frame].length === 4) {
                new_block();
            }

            var defs = please.split_params(line, ",");
            var frame = [];                
            for (var k=0; k<defs.length; k+=1) {
                var chunks = please.split_params(defs[k], " ");
                var names = ["sprite", "x", "y"];
                var sprite = {};
                for (var n=0; n<names.length; n+=1) {
                    var name = names[n];
                    var datum = chunks[n];
                    if (please.is_attr(datum)) {
                        sprite[name] = datum;
                    }
                    else {
                        sprite[name] = Number(datum);
                    }
                }
                frame.push(sprite);
            }
            ani.frames[last_frame].push(frame);
        }
    }


    // Convert the resources dict into a list with no repeating elements eg a set:
    ani.__resources = please.get_properties(ani.__resources);

    for (var i=0; i<ani.__resources.length; i+=1) {
        var file = ani.__resources[i].toLowerCase();
        if (file.indexOf(".") === -1) {
            file += ".gani";
        }
        var type = please.media.guess_type(file);
        try {
            if (type !== undefined) {
                var uri = please.relative(type, file);
                please.load(type, uri);
            }
            else {
                throw("Couldn't determine media type for: " + file);
            }
        } catch (err) {
            console.warn(err);
        }
    }

    return ani;
};



