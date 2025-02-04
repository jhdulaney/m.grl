/*

 Midnight Graphics & Recreation Library
 version < 1.0

.

 Copyright (c) 2014, Aeva M. Palecek

 M.GRL is made available to you as free software under the terms of
 the LGPLv3 or, at your option, any later version of the LGPL as
 published by the Free Software Foundation.  See
 https://www.gnu.org/licenses/lgpl-3.0.txt for more infomation.

 The code for the examples in the 'demos' folder is dedicated to the
 public domain by way of CC0.  More information about CC0 is available
 here: https://creativecommons.org/publicdomain/zero/1.0/

 The test runner is made available under the GPLv3 or newer.  See
 https://www.gnu.org/licenses/gpl-3.0.txt for more information.  The
 individual tests however are public domain by way of CC0.

 Art assets included in the demos have their respective license
 information posted on the demo index or in the individual demo
 folders.  (Hint: most of them are CC-BY-SA)

 M.GRL makes use of gl-matrix, which you can find out more about here:
 http://glmatrix.net/ and https://github.com/toji/gl-matrix

 Have a nice day!

*/

"use strict";

#include "m.macros.js"
#include "m.polyfills.js"
#include "m.defs.js"
#include "m.pages.js"
#include "m.qa.js"
#include "m.time.js"
#include "m.media.js"
#include "m.input.js"
#include "m.overlay.js"

#ifdef DOM
#include "m.dom.js"
#endif

#ifdef WEBGL
#include "m.gl.js"
#include "m.gl.ast.js"
#include "m.jta.js"
#endif

#include "m.gani.js"
#include "m.graph.js"
#include "m.camera.js"

#ifdef WEBGL
#include "m.staticdraw.js"
#include "m.builder.js"
#include "m.compositing.js"
#include "m.effects.js"
#include "m.lights.js"
#include "m.prefab.js"
#include "m.struct.js"
#include "m.particles.js"
#endif

#ifdef ASSETS
#include "tmp/text_assets.js"
#ifdef WEBGL
#include "tmp/glsl_assets.js"
#endif
#include "tmp/image_assets.js"
#endif

#ifdef BSIDES
// -------------------------------------------------------------------------- //
// What follows are optional components, and may be safely removed.
// Please tear at the perforated line.
//

#ifdef EXPERIMENTAL
// -------------------------------------------------------------------------- //
// What follows are experimental components, and may be safely removed.
// Please tear at the perforated line.
//

#include "m.masks.js"

#endif
#endif
