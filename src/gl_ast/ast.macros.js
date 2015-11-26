// - gl_ast/ast.macros.js --------------------------------------------- //


/*
 *  This file is where non-standard extensions to GLSL syntax and
 *  related helper functions should ideally be defined.
 */


// Find include statements in the provided near-complete syntax tree.
please.gl.macros.include = function (ast) {
    ITER(i, ast.data) {
        var item = ast.data[i];
        if (item.constructor == please.gl.ast.Invocation && item.name == "include") {
            var args = item.args.data;
            try {
                console.assert(item.bound == false);
                console.assert(args.length == 1);
                console.assert(args[0].constructor == please.gl.ast.Comment);
                console.assert(args[0].quotation);
            } catch (error) {
                console.warn(error);
                throw new Error("Malformed include statement on line " +
                                item.meta.line + " at char " + item.meta.char +
                                " in file " + item.meta.uri);
            }
            var uri = args[0].data;
            ast.inclusions.push(uri);
        }
    };
};


// Recieves a dictionary of global variables, returns support code.
please.gl.macros.curve = function (globals) {
    var out = "";
    var types = [];
    var template = please.access("curve_template.glsl").src;
    ITER_PROPS(name, globals) {
        var global = globals[name];
        if (global.macro == "curve") {
            var signature = global.type + ":" + global.size;
            if (types.indexOf(signature) == -1) {
                types.push(signature);
            }
        }
    };
    ITER(i, types) {
        var parts = types[i].split(":");
        var type = parts[0];
        var size = parts[1];
        out += template.replace(/GL_TYPE/gi, type).replace(/ARRAY_LEN/gi, size);
    }
    return out;
};


//
please.gl.macros.rewrite_swappable = function (method, available) {
    var lookup = {};
    ITER(a, available) {
        var pick = available[a];
        if (pick.macro == "plugin") {
            lookup[pick.name] = pick;
        }
    }
    console.assert(method.dynamic_globals.length == 1);

    var original = method.print().split('\n');
    var args = method.input.map(function (arg) {
        return arg[1];
    }).join(", ");
    
    var body = '';
    body += 'switch (' + method.dynamic_globals[0].name + ') {\n'
    var order = method.enumerate_plugins(available);
    ITER(i, order) {
        if (i > 0) {
            body += 'case ' + i + ':\n';
            // print invocation to other method
            body += '  return ' + order[i] + '(' + args + ');\n';
        }
    }
    body += 'default:\n';
    // print original method body here

    body += original.slice(1, -2).join('\n') + '\n';

    body += '  break;\n';
    body += '}';

    var out = original[0] + '\n';
    var parts = body.split('\n');
    ITER(i, parts) {
        out += '  ' + parts[i] + '\n';
    }
    out += '}\n'
    return out;
};
