// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Template.leaderboard.players = function () {
    return Players.find({}, {sort:{score:-1, alias:1}});
};

Template.leaderboard.selected_name = function () {
    var player = Players.findOne(Session.get("selected_player"));
    return player && player.alias;
};

Template.player.selected = function () {
    return Session.equals("selected_player", this._id) ? "selected" : '';
};

Template.leaderboard.events({
    'click input.inc':function () {
        Players.update(Session.get("selected_player"), {$inc:{score:5}});
    }
});

Template.player.events({
    'click':function () {
        Session.set("selected_player", this._id);
        var player = Players.findOne(Session.get("selected_player"));
        runWebGLApp();
        var player1 = Players.findOne({"alias":player.alias});
        Scene.objects.pop();
        Scene.addObject(player1, {hidden:false});
        app.refresh();
//        var player2 = Players.findOne({"alias":"SimpleCube"});
//        Scene.addObject(player2, {hidden:true});
    }
});

//WebGL parts
var camera = null;
var interactor = null;
var transforms = null;
var useVertexColors = false;

function configure(){
    gl.clearColor(0.3,0.3,0.3, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    //gl.disable(gl.DEPTH_TEST);
    //gl.enable(gl.BLEND);
    //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    //Creates and sets up the camera location
    camera = new Camera(CAMERA_ORBITING_TYPE);
    camera.goHome([0,0,4]);
    camera.setFocus([0.0,0.0,0.0]);
    camera.setAzimuth(45);
    camera.setElevation(-30);
    camera.hookRenderer = draw;

    //Creates and sets up the mouse and keyboard interactor
    interactor = new CameraInteractor(camera, document.getElementById('canvas-element-id'));

    //Scene Transforms
    transforms = new SceneTransforms(camera);

    //init transforms
    transforms.init();

    //Program
    attributeList = ["aVertexPosition",
        "aVertexNormal",
        "aVertexColor"];

    uniformList = [	"uPMatrix",
        "uMVMatrix",
        "uNMatrix",
        "uMaterialDiffuse",
        "uMaterialAmbient",
        "uLightAmbient",
        "uLightDiffuse",
        "uLightPosition",
        "uWireframe",
        "uAlpha",
        "uUseVertexColor",
        "uUseLambert"
    ];


    Program.load(attributeList, uniformList);

    gl.uniform3fv(Program.uLightPosition,   [0,5,20]);
    gl.uniform3fv(Program.uLightAmbient,    [1.0,1.0,1.0,1.0]);
    gl.uniform4fv(Program.uLightDiffuse,    [1.0,1.0,1.0,1.0]);
    gl.uniform1f(Program.uAlpha, 1.0);
    gl.uniform1i(Program.uUseVertexColor, useVertexColors);
    gl.uniform1i(Program.uUseLambert, true);

}



/**
 * Loads the scene
 */
function load(){


//    Scene.loadObject('models/geometry/complexCube.json','cube2', {hidden:true});
}




/**
 * invoked on every rendering cycle
 */
function draw() {
    gl.viewport(0, 0, c_width, c_height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    transforms.updatePerspective();

    try{
        for (var i = 0; i < Scene.objects.length; i++){

            var object = Scene.objects[i];

            if (object.hidden == true) continue;

            transforms.calculateModelView();
            transforms.push();
            transforms.setMatrixUniforms();
            transforms.pop();

            //Setting uniforms
            gl.uniform4fv(Program.uMaterialDiffuse, object.diffuse);
            gl.uniform4fv(Program.uMaterialAmbient, object.ambient);
            gl.uniform1i(Program.uWireframe,object.wireframe);


            //Setting attributes
            gl.enableVertexAttribArray(Program.aVertexPosition);
            gl.disableVertexAttribArray(Program.aVertexNormal);
            gl.disableVertexAttribArray(Program.aVertexColor);

            gl.bindBuffer(gl.ARRAY_BUFFER, object.vbo);
            gl.vertexAttribPointer(Program.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(Program.aVertexPosition);

            gl.uniform1i(Program.uUseVertexColor, useVertexColors);

            if (object.scalars != null && useVertexColors){
                gl.enableVertexAttribArray(Program.aVertexColor);
                gl.bindBuffer(gl.ARRAY_BUFFER, object.cbo);
                gl.vertexAttribPointer(Program.aVertexColor, 4, gl.FLOAT, false, 0, 0);

            }


            if(!object.wireframe){
                gl.bindBuffer(gl.ARRAY_BUFFER, object.nbo);
                gl.vertexAttribPointer(Program.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(Program.aVertexNormal);
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.ibo);

            if (object.wireframe){
                gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_SHORT,0);
            }
            else{
                gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_SHORT,0);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        }
    }
    catch(err){
        alert(err);
        console.error(err.description);
    }
}


/**
 * Entry point. This function is invoked when the page is loaded
 */
var app = null;
function runWebGLApp() {
    app = new WebGLApp("canvas-element-id")
    app.configureGLHook = configure;
    app.loadSceneHook   = load;
    app.drawSceneHook   = draw;
    app.run();
}