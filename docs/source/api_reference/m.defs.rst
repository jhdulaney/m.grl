

m.defs.js
=========

This part of the module is responsible primarily for polyfills of
language features that are present in Firefox but absent from other
browsers. This file also implements some helper functions that are
widely used within M.GRL's codebase, and defines the module's faux
namespace 'please'.




please.prop_map
---------------
*please.prop\_map* **(dict, callback)**

Variation of array.map for non-array objects:

-  **dict** an object to be enumerated.

-  **callback** A function to be called for each of the object's
   properties.

Returns an object with same keys as the dict parameter, but who's values
are the callback return values.

.. code-block:: javascript

    var some_ob = {"prop_name" : "prop_value"};
    please.prop_map(some_ob, function(key, value, dict) {
        console.info(key + " = " + value);
    });


please.once
-----------
*please.once* **(callback)**

Returns a function that will call a callback, but only the first time it
is called. If the returned function is being used as an event handler,
then it will attempt to remove itself so as to prevent further calls.

-  **callback** A function to be called only once.

.. code-block:: javascript

    var counter = 0;
    function increment() { counter += 1 };

    var burn_after_reading = please.once(increment);

    burn_after_reading(); // increment is called
    burn_after_reading(); // nothing happens
    burn_after_reading(); // nothing happens

    console.assert(counter === 1); // assertion should pass


please.split\_params
--------------------
*please.split\_params* **(line[, delim=" "])**

Splits a string of text into tokens (or "parameters"). The whitespace is
trimmed from the resulting tokens before they are returned in an array.

-  **line** A string of text to be split into tokens.

-  **delim** An optional delimiting character, defaults to " ".

.. code-block:: javascript

    var message = "This   is a      test.";
    var params = please.split_params(message, " ");
    // params is equal to ["This", "is", "a", "test."];


please.get\_properties
----------------------
*please.get\_properties* **(obj)**

A name alias for Object.getOwnPropertyNames. These are both the same
function. See `this MDN
article <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames>`__
for more information.


please.Signal
-------------
*please.Signal* **(represented)**

Signals are basically functions that can be given multiple bodies and
have no return value. They are intended to be used for event
dispatching.

This creates a Signal object. A Signal object can be called like a
function (because it is one), but you must attach callbacks to it to
provide it's behavior. The "represented" argument is the 'this' value
for the callback methods. If "represented" is missing or is null, then
'this' will be the Window object.

Basic usage:

.. code-block:: javascript

    var represented = {};
    var some_event = please.Signal(represented);

    some_event.connect(function (a, b, c) {
        console.info(a+b+c);
        console.info(this);
    });

    some_event.connect(function (a, b, c) {
        console.info(a*b*c);
        console.info(this);
    }.bind(window));

    some_event(10, 20, 30);

The results of running the above would be this in the Javascript
console:

.. code-block:: javascript

    First callback:
    - 60
    - Object {  }

    Second callback:
    - 6000
    - Window


please.array_hash
-----------------
*please.array\_hash* **(array, digits)**

Returns a string that represents the array. This is mainly used for
comparing two arrays.


please.random\_of
-----------------
*please.random\_of* **(array)**

Returns a random element from a given array.

-  **array** An array of objects.


please.radians
--------------
*please.radians* **(degrees)**

Converts from degrees to radians.

-  **degrees** An angular value expressed in dgersee.


please.degrees
--------------
*please.degrees* **(radians)**

Converts from radians to degrees.

-  **degrees** An angular value expressed in dgersee.


please.mix
----------
*please.mix* **(lhs, rhs, a)**

Works like the GLSL mix function: linearily interpolates between
variables 'lhs' and 'rhs'. Variable 'a' should be a numerical value such
that 0.0 <= a <= 1.0. The first two parameters may be numbers, arrays of
numbers, or GraphNodes.

If both 'lhs' and 'rhs' are of length four, this method will assume them
to represent quaternions, and use 'SLERP' interpolation instead of
linear interpolation. To avoid this for non-quaternion vec4's, set the
property "not\_quat" on one or both elements to true.


please.distance
---------------
*please.distance* **(lhs, rhs)**

Returns the distance between two items. Arguments may be numbers,
vectors, quaternions, arrays (four or fewer elements), or graph nodes,
provided that they both have the same number of elemnts. So, one param
might be a graph node, and the other might be a vec3, and it would work
fine.

If you are working for sure with, say, two vectors of the same size, it
will be marginally faster to use gl-matrix's distance methods instead.


please.linear_path
------------------
*please.linear\_path* **(start, end)**

Generator, the returned function takes a single argument 'a' which is
used as an argument for calling please.mix. The points argument passed
to the generator is also passed along to the mix function. This is
provided as a convinience for animation drivers.


please.bezier
-------------
*please.bezier* **(points, a)**

Finds a point on a multidimensional bezier curve. Argument 'points' is
an array of anything that can be passed to the please.mix function.
Argument 'a' is a value between 0.0 and 1.0, and represents progress
along the curve.


please.bezier_path
------------------
*please.bezier\_path* **(points)**

Generator, the returned function takes a single argument 'a' which is
used as an argument for calling please.bezier. The points argument
passed to the generator is also passed along to the bezier function.
This is provided as a convinience for animation drivers.


please.path_group
-----------------
*please.path\_group* **(paths)**

Generator, the returned function takes a single argument 'a' which is
used as an argument, which is divided evenly between the path functions
(such as the output of please.bezier\_path). So if you call the output
function with a value of '0', it'll call the first path function with
'0'. Likewise, '1' would call the last one with '1'. This is used for
combining multiple paths together.


please.path_driver
------------------
*please.path\_driver* **(path, period, repeat, oscilate)**

This function generates a driver function for animating along a path
reterned by another generator function.

.. code-block:: javascript

    var path = please.linear_path(-10, 10);
    player.location_x = please.path_driver(path, 1000, true, true);


please.oscillating_driver
-------------------------
*please.oscillating\_driver* **(start, end, time)**

Shorthand for this:

.. code-block:: javascript

    please.path_driver(please.linear_path(start, end), time, true, true);


please.repeating_driver
-----------------------
*please.repeating\_driver* **(start, end, time)**

Shorthand for this:

.. code-block:: javascript

    please.path_driver(please.linear_path(start, end), time, true, false);


please.shift_driver
-------------------
*please.shift\_driver* **(start, end, time)**

Shorthand for this:

.. code-block:: javascript

    please.path_driver(please.linear_path(start, end), time, false, false);


please.break_curve
------------------
*please.break\_curve* **(curve, target\_spacing)**

Takes a curve function and an arbitrary distance, and returns a list of
points along that curve which are less than the target distance apart.


please.merge_pointset
---------------------
*please.merge\_pointset* **(pointset, spacing, fitting, centered)**

Take a given pointset (an array of coordinates, where the array has a
"distance" property that tells you how long it is), and produce a new
set of points wherein the spacing matches more or less the spacing
argument.

The 'fitting' argument determines if the spacing should expand or shrink
if the pointset's distance does not neatly divide. It defaults to 'any'
if not set or is given an invalid value, but may also be set to 'shrink'
or 'expand'.

The 'centered' argument determines if the endpoints of the pointset
should be included or not in the returned set. It defaults to true if
unset. Basically the difference is trying to draw something of X size
within the area of the curve, verses dividing a data set into some
number of parts X distance apart.


please.trace_curve
------------------
*please.trace\_curve* **(curve, spacing, fitting, centered)**

Wraps please.break\_curve and please.merge\_pointset.


please.uuid
-----------
*please.uuid* **()**

Generates a Universally Unique Identifier (UUID) string, in accordance
to version 4 of the specification. In other words, this returns a
randomized string in which generating it twice is statistically
improbable enough so that it can be used to identify something with the
reasonable expectation that it won't refer to anything else. This is
useful for primary keys, routing data, and so on. Where possible,
randomness is generated via window.crypto (supported by most modern
browsers), with a (slower) fallback on Math.random.


please.decode\_buffer
---------------------
*please.decode\_buffer* **(blob)**

Creates and returns an ArrayBuffer from Base64 encoded binary data.

-  **blob** A Base64 encoded binary array.


please.typed\_array
-------------------
*please.typed\_array* **(raw, hint)**

Creates and returns a typed array object from a Base64 encoded string of
binary data.

-  **raw** The Base64 encoded string containing an array of binary data.

-  **hint** A string describing the data type for the packed binary
   data. Must be one of the following: "Float16Array", "Float32Array",
   "Int32Array", "Uint16Array", and "Uint32Array". The hint
   "Float16Array" will cause the resulting data to be safely cast to the
   Float32Array type since javascript lacks a Float16Array type.


please.make_animatable
----------------------
*please.make\_animatable* **(obj, prop, default\_value, proxy, lock,
write\_hook)**

Sets up the machinery needed to make the given property on an object
animatable.


please.make_animatable_tripple
------------------------------
*please.make\_animatable\_tripple* **(object, prop, swizzle,
default\_value, proxy, write\_hook);**

Makes property 'prop' an animatable tripple / vec3 / array with three
items. Parameter 'object' determines where the cache lives, the value of
'this' passed to driver functions, and if proxy is unset, this also
determines where the animatable property is written. The 'prop' argument
is the name of the property to be animatable (eg 'location'). Swizzle is
an optional string of three elements that determines the channel names
(eg, 'xyz' to produce location\_x, location\_y, and location\_z). The
'initial' argument determines what the property should be set to, and
'proxy' determines an alternate object for which the properties are
written to.

As mentioned above, if an animatable tripple is passed a GraphNode, then
an implicit driver function will be generated such that it returns the
'location' property of the GraphNode.

If the main handle (eg 'location') is assigned a driver function, then
the swizzle handles (eg, 'location\_x') will stop functioning as setters
until the main handle is cleared. You can still assign values to the
channels, and they will appear when the main handle's driver function is
removed. To clear the main handle's driver function, set it to null.


