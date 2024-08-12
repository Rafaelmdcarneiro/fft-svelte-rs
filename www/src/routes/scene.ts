import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls';
import {LineSegments} from './lines/LineSegments.js'
import {LineMaterial} from './lines/LineMaterial.js'
import {LineSegmentsGeometry} from './lines/LineSegmentsGeometry.js'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export const createScene = (el : HTMLCanvasElement, camFrame: HTMLElement) => {


  const axisLabelTextures = ["Re","Im","t","ω"].map((l) => {
    const ctx = document.createElement('canvas').getContext('2d');
    if(ctx) {
      const texRes = 64
      ctx.canvas.width = texRes;
      ctx.canvas.height = texRes;
      ctx.translate(texRes/2,texRes/2)
      ctx.rotate(-Math.PI/2)
      ctx.translate(0,texRes/4)

      ctx.fillStyle = '#000';
      ctx.imageSmoothingEnabled= false
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.textAlign = "center"; 
      ctx.fillStyle = '#fff';
      ctx.font = Math.round(texRes*0.65) + "px monospace"
      ctx.fillText(l,0,0)
      return new THREE.CanvasTexture(ctx.canvas);
    }
  })

  const sideLabelTextures = ["f(t)","F(ω)","f(-t)","F(-ω)"].map((l) => {
    const ctx = document.createElement('canvas').getContext('2d');
    if(ctx) {
      const texRes = 64
      ctx.canvas.width = texRes;
      ctx.canvas.height = texRes;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.translate(texRes/2,texRes/2)
      ctx.rotate(-Math.PI/2)
      ctx.translate(0,texRes/4)

      ctx.imageSmoothingEnabled= false
      ctx.textAlign = "center"; 
      ctx.fillStyle = '#fff';
      ctx.font = Math.round(texRes*0.35) + "px monospace"
      ctx.fillText(l,0,0)
      document.body.appendChild(ctx.canvas)
      return new THREE.CanvasTexture(ctx.canvas);
    }
  })

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 1000);
  const boxGeoX = new THREE.BoxGeometry(10, 10, 10);
  const socketGeo = new THREE.BoxGeometry(10.05, 0.2, 10.05);
  boxGeoX.addGroup(0,6, 0)
  boxGeoX.addGroup(6,Infinity, 1)

  const boxGeo = new THREE.BoxGeometry();
  const labelGeo = new THREE.PlaneGeometry(.3,.3);
  const light = new THREE.AmbientLight("white", 4);

  const stretchHeight = 1/1.618

  const outlineGeo = new LineSegmentsGeometry(3, 1);
  outlineGeo.setPositions([
    -5,-5,-5,5,-5,-5,
    -5,-5,5,5,-5,5,
    -5,-5,5,-5,-5,-5,
    5,-5,5,5,-5,-5,


    -5,5,-5,5,5,-5,
    -5,5,5,5,5,5,
    -5,5,5,-5,5,-5,
    5,5,5,5,5,-5,

    -5,5,-5,-5,-5,-5,
    5,5,-5,5,-5,-5,
    -5,5,5,-5,-5,5,
    5,5,5,5,-5,5,
  ]);


  const labelGeoNew = new LineSegmentsGeometry(3, 1, [LineSegmentsGeometry.squareCapStart(-3,3)]);
  labelGeoNew.setPositions([
    0,0,0,
    0,0,0,
  ]);

  const sideLabelGeoNew = new LineSegmentsGeometry(3, 1, [LineSegmentsGeometry.squareCapStart(0,0)]);
  sideLabelGeoNew.setPositions([
    0,0,0,
    0,0,0,
  ]);

    
   const curveGeo = new LineSegmentsGeometry(2, 0);

   curveGeo.setPositions([0,0,0,0]);
   curveGeo.addGroup(0,Infinity, 0)
   curveGeo.addGroup(0,Infinity, 1)
   curveGeo.addGroup(0,Infinity, 2)
   curveGeo.addGroup(0,Infinity, 3)
   curveGeo.addGroup(0,Infinity, 4)

   const curveGeoAlt = new LineSegmentsGeometry(2, 0);

   curveGeoAlt.setPositions([0,0,0,0]);
   curveGeoAlt.addGroup(0,Infinity, 0)
   curveGeoAlt.addGroup(0,Infinity, 1)
   curveGeoAlt.addGroup(0,Infinity, 2)
   curveGeoAlt.addGroup(0,Infinity, 3)
   curveGeoAlt.addGroup(0,Infinity, 4)

   const curveGeoTop = new LineSegmentsGeometry(2, 0);

   curveGeoTop.setPositions([0,0,0,0])
   curveGeoTop.addGroup(0,Infinity, 1)



    const axisGeo = new LineSegmentsGeometry(3, 1, [LineSegmentsGeometry.roundCapStart, LineSegmentsGeometry.arrowCapEnd]);
    axisGeo.setPositions([
      -0.3,0,0,
      2.3,0,0,

      0,-0.3,0,
      0,2.8,0,

      0,0,4.5,
      0,0,-4.5,
    ]);



  let lineMats = []
  let labelMats = []
  let barMats = []
  let polarMaterials = []
  let polarHide = []

  const rotations = [
    {rot: new THREE.Vector3(0, 0*Math.PI/2, 0), color:  0x00ffff, shadow: true, showAxis: true, curve: curveGeo, sideLabelIndex: 0, xAxisLabel: 2, reflector: new THREE.Vector3(1,1,-1)},
    {rot: new THREE.Vector3(0, 1*Math.PI/2, 0), color: 0x00ff00, shadow: true, showAxis: true, curve: curveGeoAlt, sideLabelIndex: 1, xAxisLabel: 3, reflector: new THREE.Vector3(1,1,-1)},
    {rot: new THREE.Vector3(0, 2*Math.PI/2, 0), color: 0xff00ff, shadow: true, showAxis: true, curve: curveGeo, sideLabelIndex: 2, xAxisLabel: 2, reflector: new THREE.Vector3(1,1,1)},
    {rot: new THREE.Vector3(0, 3*Math.PI/2, 0), color: 0xff0000, shadow: true, showAxis: true, curve: curveGeoAlt, sideLabelIndex: 3, xAxisLabel: 3, reflector: new THREE.Vector3(1,1,1)},
    {rot: new THREE.Vector3(0,0,+Math.PI/2), color: 0x0000ff, shadow: true, showAxis: false, curve: curveGeoTop, sideLabelIndex: null, xAxisLabel: 2, reflector: new THREE.Vector3(1,1,-1)},
    {rot: new THREE.Vector3(0,0,-Math.PI/2), skip: true},
  ]

  const axees = []

  let cubeSides = []
  let labels = []
  let sides = new THREE.Group();
  let root = new THREE.Group();
  scene.add(root)

  let i = 1;
  for(let {rot, color, shadow, showAxis, skip, curve, xAxisLabel, reflector, sideLabelIndex} of rotations) {
    if(skip) continue;

    let sideOuter = new THREE.Group();
    let sideInner = new THREE.Group();
    let side = new THREE.Group();
    let graph = new THREE.Group();
    let graphOuter = new THREE.Group();
    i++;
    const color_mask_sub = 0b00000000_01000111_01000111_01000111
    const color_mask_add = 0b00000000_10111000_10111000_10111000
    const line_color_mask_sub = 0b00000000_01110111_01110111_01110111
    const line_color_mask_add = 0b00000000_00111111_00111111_00111111
    const window_color_mask_sub = 0b00000000_00110111_00110111_00110111
    const window_color_mask_add = 0b00000000_11000000_11000000_11000000
    const cubeMaterial = new THREE.MeshLambertMaterial({ color: color & color_mask_sub | color_mask_add });
    const windowMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const faceMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const nullMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    nullMaterial.depthWrite = false;
    nullMaterial.depthTest = false;
    nullMaterial.colorWrite = false;
    nullMaterial.stencilWrite = false;
    nullMaterial.side = THREE.BackSide;

    faceMaterial.depthWrite = false;
    faceMaterial.depthTest = false;
    faceMaterial.colorWrite = true;
    faceMaterial.stencilWrite = true;
    faceMaterial.stencilRef = i;
    faceMaterial.stencilFunc = THREE.AlwaysStencilFunc;
    faceMaterial.stencilZPass = THREE.ReplaceStencilOp;
    faceMaterial.side = THREE.FrontSide;

    cubeMaterial.stencilWrite = true;
    cubeMaterial.stencilRef = i;
    cubeMaterial.stencilFunc = THREE.EqualStencilFunc;
    cubeMaterial.side = THREE.BackSide;
    cubeMaterial.depthWrite = true
    cubeMaterial.depthTest = true;

    windowMaterial.stencilWrite = true;
    windowMaterial.stencilRef = i;
    windowMaterial.stencilFunc = THREE.EqualStencilFunc;
    windowMaterial.side = THREE.BackSide;
    windowMaterial.depthWrite = true
    windowMaterial.depthTest = true;

    const cube = new THREE.Mesh(boxGeoX, [nullMaterial, cubeMaterial]);
    const face = new THREE.Mesh(boxGeoX, [faceMaterial, nullMaterial]);

    face.renderOrder = 10 + i*2
    cube.renderOrder = 10 + i*2+1



    sideInner.add(face);
    sideInner.add(cube);

    sideInner.rotation.x = rot.x
    sideInner.rotation.y = rot.y
    sideInner.rotation.z = rot.z

    side.add(sideInner)

    side.scale.y = stretchHeight

    const axisMaterial = new LineMaterial({
      color: 0x555555,
      linewidth: 0.7, // in world units with size attenuation, pixels otherwise
      vertexColors: false,
      alphaToCoverage: true,
      depthTest: true,
      depthWrite: true,
      transparent: true,
    });


    polarMaterials.push(axisMaterial)
    axisMaterial.polar = true;
    axisMaterial.polarSourceLength = 30;
    axisMaterial.polarRadiusScale = 0.2;
    axisMaterial.polarRadiusBase = 2.5;
    axisMaterial.stencilWrite = true;
    axisMaterial.stencilRef = i;
    axisMaterial.stencilFunc = THREE.EqualStencilFunc;

    const axis = new LineSegments(axisGeo, axisMaterial);
    axis.scale.y = 0.7

    axees.push(graphOuter)

    polarHide.push(axis)
    axis.renderOrder = 10 + i*2+5
    axisMaterial.depthTest = true

    const labelMatX = new LineMaterial({ color: 0x000000 });
    labelMatX.polar = false;
    labelMatX.polarSourceLength = 30;
    labelMatX.polarRadiusBase = 0;
    labelMatX.stencilWrite = true;
    labelMatX.stencilRef = i;
    labelMatX.alphaMap = axisLabelTextures[1]
    labelMatX.transparent = true
    labelMatX.stencilFunc = THREE.EqualStencilFunc;
    labelMatX.depthTest = false;
    labelMatX.depthWrite = false;
    labelMatX.linewidth = 6;
    labelMatX.textured = true;

    const labelMatY = new LineMaterial({ color: 0x000000 });
    labelMatY.polar = false;
    labelMatY.polarSourceLength = 30;
    labelMatY.polarRadiusBase = 2.5;
    labelMatY.stencilWrite = true;
    labelMatY.stencilRef = i;
    labelMatY.alphaMap = axisLabelTextures[0]
    labelMatY.transparent = true
    labelMatY.stencilFunc = THREE.EqualStencilFunc;
    labelMatY.depthTest = false;
    labelMatY.depthWrite = false;
    labelMatY.linewidth = 6;
    labelMatY.textured= true;

    const labelMatZ = new LineMaterial({ color: 0x000000 });
    labelMatZ.polar = false;
    labelMatZ.polarSourceLength = 30;
    labelMatZ.polarRadiusBase = 2.5;
    labelMatZ.stencilWrite = true;
    labelMatZ.stencilRef = i;
    labelMatZ.alphaMap = axisLabelTextures[xAxisLabel]
    labelMatZ.transparent = true
    labelMatZ.stencilFunc = THREE.EqualStencilFunc;
    labelMatZ.depthTest = false;
    labelMatZ.depthWrite = false;
    labelMatZ.linewidth = 6;
    labelMatZ.textured = true;

    const xLabel = new LineSegments(labelGeoNew, labelMatX);
    xLabel.renderOrder = 10 + i*2+150
    xLabel.position.x = 2.3;
    labels.push(xLabel)


    const yLabel = new LineSegments(labelGeoNew, labelMatY);
    yLabel.renderOrder = 10 + i*2+150
    yLabel.position.y = 2.8;
    labels.push(yLabel)

    const zLabel = new LineSegments(labelGeoNew, labelMatZ);
    zLabel.renderOrder = 10 + i*2+150
    zLabel.position.z = -4.5;
    labels.push(zLabel)


    polarHide.push(xLabel, yLabel, zLabel)

    if(showAxis) {
      axis.add(xLabel)
      axis.add(yLabel)
      axis.add(zLabel)

      graph.add(axis)
    }

    //graph.position.x = 8
    lineMats.push(axisMaterial)

    lineMats.push(labelMatX, labelMatY, labelMatZ)
    labelMats.push(labelMatX, labelMatY, labelMatZ)
    labelMatX.baseWidth = 6
    labelMatY.baseWidth = 6
    labelMatZ.baseWidth = 6

 
    xLabel.renderOrder = 10 + i*2+150
    labels.push(xLabel)

    if(sideLabelIndex != null) {
      const sideLabelMat = new LineMaterial({ color: 0x222222 });
      sideLabelMat.polar = false;
      sideLabelMat.polarSourceLength = 30;
      sideLabelMat.polarRadiusBase = 2.5;
      sideLabelMat.stencilWrite = true;
      sideLabelMat.stencilRef = i;
      sideLabelMat.stencilFunc = THREE.EqualStencilFunc;
      sideLabelMat.alphaMap = sideLabelTextures[sideLabelIndex]
      sideLabelMat.transparent = true
      sideLabelMat.depthTest = true;
      sideLabelMat.depthWrite = false;
      sideLabelMat.linewidth = 10;
      sideLabelMat.textured = true;


      const sideLabel = new LineSegments(sideLabelGeoNew, sideLabelMat);
      sideLabel.renderOrder = 4
      sideLabel.position.x = 4.5;
      sideLabel.position.y = -4.3;

      labelMats.push(sideLabelMat)
      sideLabelMat.baseWidth = 10

      lineMats.push(sideLabelMat)


      sideInner.add(sideLabel)
    }
   

    const outlineMat = new LineMaterial({
      color: color & line_color_mask_sub | line_color_mask_add,
      linewidth: 0.7, // in world units with size attenuation, pixels otherwise
      vertexColors: false,
      alphaToCoverage: true,
    });

    outlineMat.depthTest = false
    outlineMat.depthWrite = true
    outlineMat.transparent = true
    outlineMat.stencilWrite = true;
    outlineMat.stencilRef = i;
    outlineMat.stencilFunc = THREE.EqualStencilFunc;
    lineMats.push(outlineMat)

    const outline = new LineSegments(outlineGeo, outlineMat);

    outline.renderOrder = 10 + i*2+1




    side.add(outline)

    const curveBarMaterial = new LineMaterial({
      // color: color & 0b00000000_01000000_01000000_01000000 | 0b00000000_10111111_10111111_10111111,
      color: (color&0xa0a0a0| 0x4f4f4f),
      linewidth: 1.1, // in world units with size attenuation, pixels otherwise
      vertexColors: false,
      alphaToCoverage: true,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      project2d: true,
      project2DStart: new THREE.Vector3(0,0,-4.3),
      project2DEnd: new THREE.Vector3(0,0,4.3),
    });


    polarMaterials.push(curveBarMaterial)
    curveBarMaterial.polar = true;
    curveBarMaterial.polarSourceLength = 4.3;
    curveBarMaterial.polarRadiusScale = 0.5;
    curveBarMaterial.polarRadiusBase = 2.5;
    curveBarMaterial.opacity = 1;
    curveBarMaterial.stencilWrite = true;
    curveBarMaterial.stencilRef = i;
    curveBarMaterial.stencilFunc = THREE.EqualStencilFunc;
    curveBarMaterial.linearProjected = true;
    curveBarMaterial.startProjectionMul = new THREE.Vector3(0,0,reflector.z);
    curveBarMaterial.startProjectionAdd = new THREE.Vector3(0,0,0);
    curveBarMaterial.endProjectionMul = new THREE.Vector3(reflector.x,reflector.y,reflector.z);
    curveBarMaterial.endProjectionAdd = new THREE.Vector3(0,0,0);


    curveBarMaterial.polygonOffset = true;
    curveBarMaterial.polygonOffsetFactor = -5;
    curveBarMaterial.polygonOffsetUnits = 2;

    const curveBars = new LineSegments(curve, curveBarMaterial);

    curveBars.renderOrder = 10 + i*2+6
    graph.add(curveBars)

    graphOuter.add(graph)
    graphOuter.rotation.y = rot.y

    lineMats.push(curveBarMaterial)
    barMats.push(curveBarMaterial)


    const curveDotMaterial = new LineMaterial({
      // color: color & 0b00000000_01000000_01000000_01000000 | 0b00000000_10111111_10111111_10111111,
      color: color&0xa0a0a0| 0x070707,
      linewidth: 2.2, // in world units with size attenuation, pixels otherwise
      vertexColors: false,
      alphaToCoverage: true,
      transparent: true,
      depthTest: false,
      depthWrite: true,
      project2d: true,
      project2DStart: new THREE.Vector3(0,0,-4.3),
      project2DEnd: new THREE.Vector3(0,0,4.3),
    });


    curveDotMaterial.polygonOffset = true;
    curveDotMaterial.polygonOffsetFactor = -5;
    curveDotMaterial.polygonOffsetUnits = 2;

    lineMats.push(curveDotMaterial)

    polarMaterials.push(curveDotMaterial)
    curveDotMaterial.polar = true;
    curveDotMaterial.polarSourceLength = 4.3;
    curveDotMaterial.polarRadiusScale = 0.5;
    curveDotMaterial.polarRadiusBase = 2.5;
    curveDotMaterial.stencilWrite = true;
    curveDotMaterial.stencilRef = i;
    curveDotMaterial.stencilFunc = THREE.EqualStencilFunc;
    curveDotMaterial.linearProjected = true;
    curveDotMaterial.startProjectionMul = reflector;
    curveDotMaterial.startProjectionAdd = new THREE.Vector3(0,0,0);
    curveDotMaterial.endProjectionMul = reflector;
    curveDotMaterial.endProjectionAdd = new THREE.Vector3(0,0,0);

    const curveDots = new LineSegments(curve, curveDotMaterial);

    curveDots.renderOrder = 10 + i*2+7
    graph.add(curveDots)

    const shadow1 = new LineMaterial({
      color: color & 0b00000000_01110000_01110000_01110000,
      linewidth: 1.0, // in world units with size attenuation, pixels otherwise
      vertexColors: false,
      alphaToCoverage: false,
      depthTest: false,
      depthWrite: false,
      project2d: true,
      project2DStart: new THREE.Vector3(0,0,-4.3),
      project2DEnd: new THREE.Vector3(0,0,4.3),
    });

    lineMats.push(shadow1)

    shadow1.transparent = true
    shadow1.opacity = 0.05
    shadow1.stencilWrite = true;
    shadow1.stencilRef = i;
    shadow1.stencilFunc = THREE.EqualStencilFunc;
    shadow1.linearProjected = true;
    shadow1.startProjectionMul = new THREE.Vector3(0,reflector.y,reflector.z);
    shadow1.startProjectionAdd = new THREE.Vector3(-5,0,0);
    shadow1.endProjectionMul = new THREE.Vector3(0,reflector.y,reflector.z);
    shadow1.endProjectionAdd = new THREE.Vector3(-5,0,0);

    const shadow2 = new LineMaterial({
      color: color & 0b00000000_01110000_01110000_01110000,
      linewidth: 1.0, // in world units with size attenuation, pixels otherwise
      vertexColors: false,
      alphaToCoverage: false,
      depthTest: false,
      depthWrite: false,
      project2d: true,
      project2DStart: new THREE.Vector3(0,0,-4.3),
      project2DEnd: new THREE.Vector3(0,0,4.3),
    });

    lineMats.push(shadow2)
    polarMaterials.push(shadow2)
    shadow2.polar = true;
    shadow2.polarSourceLength = 4.3;
    shadow2.polarRadiusScale = 0.5;
    shadow2.polarRadiusBase = 2.5;
    shadow2.transparent = true
    shadow2.opacity = 0.05
    shadow2.stencilWrite = true;
    shadow2.stencilRef = i;
    shadow2.stencilFunc = THREE.EqualStencilFunc;
    shadow2.linearProjected = true;
    shadow2.startProjectionMul = new THREE.Vector3(reflector.x,0,reflector.z);
    shadow2.startProjectionAdd = new THREE.Vector3(0,-5*stretchHeight,0);
    shadow2.endProjectionMul = new THREE.Vector3(reflector.x,0,reflector.z);
    shadow2.endProjectionAdd = new THREE.Vector3(0,-5*stretchHeight,0);

    const shadow3 = new LineMaterial({
      color: color & 0b00000000_01110000_01110000_01110000,
      linewidth: 1.0, // in world units with size attenuation, pixels otherwise
      vertexColors: false,
      alphaToCoverage: false,
      depthTest: false,
      depthWrite: false,
      project2d: true,
      project2DStart: new THREE.Vector3(0,0,-4.3),
      project2DEnd: new THREE.Vector3(0,0,4.3),
    });

    lineMats.push(shadow3)

    shadow3.transparent = true
    shadow3.opacity = 0.05
    shadow3.stencilWrite = true;
    shadow3.stencilRef = i;
    shadow3.stencilFunc = THREE.EqualStencilFunc;
    shadow3.linearProjected = true;
    shadow3.startProjectionMul = new THREE.Vector3(reflector.x,reflector.y,0);
    shadow3.startProjectionAdd = new THREE.Vector3(0,0,5);
    shadow3.endProjectionMul = new THREE.Vector3(reflector.x,reflector.y,0);
    shadow3.endProjectionAdd = new THREE.Vector3(0,0,5);


    const shadow4 = new LineMaterial({
      color: color & 0b00000000_01110000_01110000_01110000,
      linewidth: 1.0, // in world units with size attenuation, pixels otherwise
      vertexColors: false,
      alphaToCoverage: false,
      depthTest: false,
      depthWrite: false,
      project2d: true,
      project2DStart: new THREE.Vector3(0,0,-4.3),
      project2DEnd: new THREE.Vector3(0,0,4.3),
    });

    lineMats.push(shadow4)

    shadow4.transparent = true
    shadow4.opacity = 0.05
    shadow4.stencilWrite = true;
    shadow4.stencilRef = i;
    shadow4.stencilFunc = THREE.EqualStencilFunc;
    shadow4.linearProjected = true;
    shadow4.startProjectionMul = new THREE.Vector3(reflector.x,reflector.y,0);
    shadow4.startProjectionAdd = new THREE.Vector3(0,0,-5);
    shadow4.endProjectionMul = new THREE.Vector3(reflector.x,reflector.y,0);
    shadow4.endProjectionAdd = new THREE.Vector3(0,0,-5);

    polarHide.push(shadow1, shadow3, shadow4)
    const curveShadows = new LineSegments(curve, [shadow1, shadow2, shadow3, shadow4]);

    curveShadows.renderOrder = 10 + i*2+1
    if(shadow)
      graph.add(curveShadows)

    sideOuter.add(graphOuter)

    sideOuter.add(side)

    sides.add(sideOuter);
    cubeSides.push({labelMatX,labelMatY,labelMatZ,curveDots, curveBars, sideOuter, cubeMaterial, face, shadow1, shadow2, shadow3, shadow4, curveBarMaterial, windowMaterial, curveDotMaterial, axisMaterial,outlineMat})
  }
  
  let currentFocus = null
  function focusSide(focus) {
    if(focus && !cubeSides[focus]) {
      return
    }
    for(let s=0;s<cubeSides.length;s++) {
      cubeSides[s].sideOuter.visible = focus==null
      cubeSides[s].face.visible = focus==null
      cubeSides[s].cubeMaterial.stencilRef = s+2
      cubeSides[s].windowMaterial.stencilRef = s+2
      cubeSides[s].curveBarMaterial.stencilRef = s+2
      //cubeSides[s].curveBars.visible = (focus!=null)
      cubeSides[s].curveDotMaterial.stencilRef = s+2
      cubeSides[s].axisMaterial.stencilRef = s+2
      cubeSides[s].outlineMat.stencilRef = s+2
      cubeSides[s].shadow1.stencilRef = s+2
      cubeSides[s].shadow2.stencilRef = s+2
      cubeSides[s].shadow3.stencilRef = s+2
      cubeSides[s].shadow4.stencilRef = s+2
      cubeSides[s].labelMatX.stencilRef = s+2
      cubeSides[s].labelMatY.stencilRef = s+2
      cubeSides[s].labelMatZ.stencilRef = s+2
    }

    if(focus!=null) {
      cubeSides[focus].sideOuter.visible = true
      cubeSides[focus].face.visible = false
      cubeSides[focus].cubeMaterial.stencilRef = 0
      cubeSides[focus].windowMaterial.stencilRef = 0
      cubeSides[focus].curveBarMaterial.stencilRef = 0
      cubeSides[focus].curveDotMaterial.stencilRef = 0
      cubeSides[focus].axisMaterial.stencilRef = 0
      cubeSides[focus].outlineMat.stencilRef = 0
      cubeSides[focus].shadow1.stencilRef = 0
      cubeSides[focus].shadow2.stencilRef = 0
      cubeSides[focus].shadow3.stencilRef = 0
      cubeSides[focus].shadow4.stencilRef = 0
      cubeSides[focus].labelMatX.stencilRef = 0
      cubeSides[focus].labelMatY.stencilRef = 0
      cubeSides[focus].labelMatZ.stencilRef = 0

      socket.visible = false

      controls.minDistance = 1
      controls.maxDistance = 12
    } else {
      controls.minDistance = 8
      controls.maxDistance = 20
      socket.visible = true
    }

    currentFocus = focus
  }
  
  const dirLight = new THREE.DirectionalLight( "white", 3);
  dirLight.position.x = 7
  dirLight.position.y = 11
  dirLight.position.z = 13
  root.add(dirLight);


  root.add(light);
  root.add(sides);

  const socketMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  socketMat.depthTest = false
  socketMat.depthWrite = false

  const socket = new THREE.Mesh(socketGeo, socketMat);
  socket.position.y=-5*stretchHeight-0.1
  socket.renderOrder = 5

  camera.position.x = 14;
  camera.position.z = 6;
  camera.position.y = 4;

  root.add(socket)

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: el, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor( 0xeffbff, 1);
  
  const controls = new OrbitControls( camera, renderer.domElement );

  const upVector = new THREE.Vector3(1,1/stretchHeight,1);

  controls.addEventListener('change', (e) => {
    if(!renderer.xr.isPresenting) {
      const newLength = camera.position.length()

      if(newLength < 8.5 && currentFocus === null) {
        focusSide(indexOfSmallest(refRotations.map((x) => x.angleTo(upVector.set(1,1/stretchHeight,1).multiply(camera.position)))))
      } else if(newLength > 8.5 && currentFocus === indexOfSmallest(refRotations.map((x) => x.angleTo(upVector.set(1,1/stretchHeight,1).multiply(camera.position))), Math.PI/8)) {
        focusSide(null)
      }
    }
  })

  controls.addEventListener('end', (e) => {
    if(!renderer.xr.isPresenting) {
      const newLength = camera.position.length()

      if(newLength < 8.5 && currentFocus === null) {
        focusSide(indexOfSmallest(refRotations.map((x) => x.angleTo(upVector.set(1,1/stretchHeight,1).multiply(camera.position)))))
      } else if(newLength > 8.5 && currentFocus === indexOfSmallest(refRotations.map((x) => x.angleTo(upVector.set(1,1/stretchHeight,1).multiply(camera.position))))) {
        focusSide(null)
      }
    }
  })

  focusSide(null)
  controls.enablePan  = false

  const refRotations = rotations.map((r) => (new THREE.Vector3(1,0,0)).applyEuler(new THREE.Euler(r.rot.x, r.rot.y, r.rot.z)))


  function indexOfSmallest(a, min = null) {
   var lowest = null;
   for (var i = 0; i < a.length; i++) {
    if ((lowest === null || a[i] < a[lowest]) && (min === null || a[i] <= min)) lowest = i;
   }
   return lowest;
  }

  const labelVec = new THREE.Vector3();
  let rotationSubscriber = null
  const renderTargetSize = new THREE.Vector2();

  const blub = new THREE.Vector3();
  const bla = new THREE.Vector3();
  let vrController;
  let currentSession = null

  renderer.xr.addEventListener( 'sessionstart', function() {
    currentSession = renderer.xr.getSession();
    vrController = renderer.xr.getController(0);
    root.scale.set(0.05,0.05,0.05)
  });

  renderer.xr.addEventListener( 'sessionend', function() {
    vrController = null
    currentSession = null

    root.position.set(0,0,0)
    root.rotation.set(0,0,0)
    root.scale.set(1,1,1)
  });

  const animate = () => {

    if(resizeRendererToDisplaySize(renderer)) {
      camera.aspect = window.innerWidth / window.innerHeight;
      controls.zoomSpeed = 2*window.devicePixelRatio;
      camera.updateProjectionMatrix();

      
      camera.setViewOffset(camFrame.offsetWidth, camFrame.offsetHeight, -camFrame.offsetLeft, -camFrame.offsetTop, window.innerWidth, window.innerHeight );
    }

    if(renderer.xr.isPresenting && vrController !==null) {
      
      for(let s = 0; s<currentSession.inputSources.length; s++) {
        const gamepad = currentSession.inputSources[s].gamepad
        for(let b =0;b<gamepad.buttons.length;b++) {
          const button = gamepad.buttons[b];

          if (button.pressed && b == 0 && renderer.xr.getController(s)) {
            vrController = renderer.xr.getController(s);
          }
        }
      }

      let controllerPos = vrController.position;
      let controllerRot = vrController.rotation;
      root.position.set(controllerPos.x, controllerPos.y, controllerPos.z)
      root.rotation.set(controllerRot.x, controllerRot.y, controllerRot.z)

      renderer.getSize(renderTargetSize)

      

      const transformedRefs = refRotations.map((x) => {
        blub.copy(x)
        blub.applyEuler(root.rotation)

        bla.copy(camera.position)
        bla.sub(root.position)

        return blub.angleTo(bla)
      })

      const newLength = camera.position.distanceTo(controllerPos)

      if(newLength < 8.5 * 0.05 && currentFocus === null) {
        focusSide(indexOfSmallest(transformedRefs))
      } else if(newLength > 8.5 * 0.05 && currentFocus === indexOfSmallest(transformedRefs)) {
        focusSide(null)
      }
      
      for(let lm of lineMats) {
        lm.resolution.set(renderTargetSize.x/2, renderTargetSize.y);
      }

      for(let lblMat of labelMats) {
        lblMat.uniforms.linewidth.value = (lblMat.baseWidth/Math.max(0.01, root.position.distanceTo(camera.position)))
      }

      for(let bm of barMats) {
        bm.opacity = 0.9 - Math.min(0.9, Math.max(0, (camera.position.distanceTo(root.position)/0.05 - 4)/10))
      }

    } else { 

      
      for(let lm of lineMats) {
        lm.resolution.set(window.innerWidth, window.innerHeight);
      }


      for(let bm of barMats) {
        bm.opacity = 0.9 - Math.min(0.9, Math.max(0, (camera.position.distanceTo(root.position) - 4)/10))
      }

    }

    controls.update();
    dirLight.position.copy(camera.position).sub(new THREE.Vector3(5,-15,1))


    if(rotationSubscriber) {
      rotationSubscriber(((2*Math.atan2(camera.position.x, camera.position.z) / Math.PI + 1)%4 + 4)%4)
    }

    for(let label of labels) {
      label.lookAt(camera.getWorldPosition(labelVec))
    }

    renderer.render(scene, camera);
  };

  let wasPresenting = false
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width  = Math.floor( canvas.clientWidth  * pixelRatio );
    const height = Math.floor( canvas.clientHeight * pixelRatio );
    const needResize = canvas.width !== width || canvas.height !== height || wasPresenting !== renderer.xr.isPresenting;
    wasPresenting = renderer.xr.isPresenting
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  renderer.xr.enabled = true;
  renderer.xr.setFramebufferScaleFactor( 2.0 ); 
  renderer.setAnimationLoop(animate);

  const vrButton = VRButton.createButton( renderer );
  document.body.appendChild( vrButton );


  return {
    dispose: () => {
      document.body.removeChild(vrButton)
      renderer.dispose()
    },
    setFractionalRotation(frac) {
      axees[4].rotation.y = frac
    },
    setSignal(sig) {
     curveGeo.setPositions(sig);
    },
    setSpectrum(sig) {
     curveGeoAlt.setPositions(sig);
    },
    setFractional(sig) {
     curveGeoTop.setPositions(sig);
    },
    onRotationChange(sub) {
      rotationSubscriber = sub;
    },
    setPolar(p) {
      for(let m of polarMaterials) {
        m.polarSkip = p?0:1
      }
      for(let m of polarHide) {
        m.visible = !p
      }
    }
  }
}
