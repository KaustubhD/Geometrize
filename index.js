'use strict'

let output = document.getElementById('output')
let typesRadio = document.querySelectorAll('input[name="type"]')
let left = output.querySelector('#left')
let stepsLabel = document.getElementById('stepsLabel')
let raster = output.querySelector('#raster')
let vector = output.querySelector('#vector')
let steps = 0
console.log(typesRadio)

function init(){
  // let typesRadio = document.querySelectorAll('input[name="type"]')
  // output.style.display = 'block'
  typesRadio.forEach(rad => {
    rad.addEventListener('click', syncRadios)
  })
  syncRadios()
  
  let ranges = document.querySelectorAll('input[type="range"]')
  ranges.forEach(syncRangesLabels)

  document.querySelector('form').addEventListener('submit', submitForm)
}
init()

function syncRadios(){
  typesRadio.forEach(rad => {
    if(rad.checked){
      output.classList.add(rad.value)
    }
  })
}

function syncRangesLabels(range){
  function syncRL(){
    range.parentNode.querySelector('.value').innerHTML = range.value
  }
  range.oninput = syncRL
  syncRL()
}

function submitForm(e){
  e.preventDefault()
  let fileIn = document.getElementById('file-input')
  let fileURL = document.getElementById('file-url')
  let temp = 'nothing'
  if(fileIn.files.length > 0){
    temp = URL.createObjectURL(fileIn.files[0])
  }
  else if(fileURL.value){
    temp = fileURL.value
  }
  let config = getConfig()
  config.temp = temp
  console.log(config)
  Canvas.newLeftCanvas(config).then(leftCanvas => {
    console.log('Canvas resolved')
    // debugger
    Canvas.newRightCanvas(leftCanvas, config)
  })
}

let numericProps = ['stepSize', 'alpha', 'viewSize', 'computeSize', 'mutateTimes', 'beginShapes']
function getConfig(){
  let form = document.querySelector('form')
  let config = {}
  numericProps.forEach(prop => {
    config[prop] = Number(form.querySelector(`[name="${prop}"]`).value)
  })
  config['mutateAlpha'] = true

  config['shapes'] = []

  form.querySelectorAll('[name="shapeName"]').forEach(el => {
    if(el.checked){ config['shapes'].push(shapeClasses[el.value])}
  })

  form.querySelectorAll('[name="fillOption"]').forEach(el => {
    if(el.checked){ 
      if(el.value == 'auto'){ config['fill'] = 'auto' }
      else{ config['fill'] = el.querySelector('[name="fillColor"]').value }
    }
  })

  return config
}

function diffIt(one, other){
  let sum = 0
  for(let i = 0; i < one.data.length; i++){
    if(i % 4 == 3){ continue }
    sum += Math.pow((other.data[i] - one.data[i]), 2)
  }
  return sum
}

function diff_dist(diff, pix){
  // I don't really understand the logic
  return Math.sqrt(diff / (3 * pix)) / 255
}

function dist_diff(dist, pix){
  // This as well
  return Math.pow(dist * 255, 2) * (3 * pix)
}

function inRange(x, min, max){
  // Really nice logic
  return Math.max(min, Math.min(max, x))
}

function getColorOfRange(color){
  return inRange(color, 0, 255)
}

function getFillColor(canvas){
	let iD = canvas.getImageData()
	let width = iD.width
	let height = iD.height
	let data = iD.data
	let rgb = [0, 0, 0]
	let count = 0
	let i
	for(let x = 0; x < width; x++){
		for(let y = 0; y < height; y++){
			if (x > 0 && y > 0 && x < width - 1 && y < height - 1){
        // Ignoring this because we only need boundary colors
        continue
      }
			count++
			i = 4 * (x + y * width) //Get the array index acc to x and y
			rgb[0] += data[i]
			rgb[1] += data[i + 1]
			rgb[2] += data[i + 2]
		}
	}
  // ~~ means return nearest lowest integer
  rgb = rgb.map(x => ~~(x / count)).map(getColorOfRange)
	return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

function newBlankCanvas(config){
  // console.log('In newblank')
  // console.log(config.width)
  return new Canvas(config.width, config.height).fillFull(config.fill)
}

function computeColor(offset, imageData, alpha){
	let color = [0, 0, 0]
	let shapeData = imageData.shape.data
	let currentData = imageData.current.data
	let targetData = imageData.target.data

	let shapeIndex, shapeX, shapeY, canvasIndex, canvasX, canvasY /* shape-index, shape-x, shape-y, full-index, full-x, full-y */
	let shapeWidth = imageData.shape.width
	let shapeHeight = imageData.shape.height
	let canvasWidth = imageData.current.width
	let canvasHeight = imageData.current.height
	let count = 0

	for(let y = 0; y < shapeHeight; y++){
		canvasY = y + offset.top
		if (canvasY < 0 || canvasY >= canvasHeight){ continue } // Not outside the shape

		for(let x = 0; x < shapeWidth; x++){
			canvasX = x + offset.left
			if (canvasX < 0 || canvasX >= canvasWidth){ continue } // Not outside the shape

			shapeIndex = 4 * (shapeX + (shapeY * shapeWidth))
			if (shapeData[shapeIndex + 3] == 0){ continue } //Ignore 0 opacity area

			canvasIndex = 4 * (canvasX + (canvasY * canvasWidth))
			color[0] += (targetData[canvasIndex] - currentData[canvasIndex]) / alpha + currentData[canvasIndex]
			color[1] += (targetData[canvasIndex + 1] - currentData[canvasIndex + 1]) / alpha + currentData[canvasIndex + 1]
			color[2] += (targetData[canvasIndex + 2] - currentData[canvasIndex + 2]) / alpha + currentData[canvasIndex + 2]

			count++
		}
	}

	return color.map(x => ~~(x/count)).map(getColorOfRange)
}

function computeDifferenceChange(offset, imageData, color) { //Copied
  // console.log('in function')
  // console.log(offset)
  // console.log(imageData)
  // console.log(color)
	let {shape, current, target} = imageData;
	let shapeData = shape.data;
	let currentData = current.data;
	let targetData = target.data;

	let a, b, d1r, d1g, d1b, d2r, d2b, d2g;
	let si, sx, sy, fi, fx, fy; /* shape-index, shape-x, shape-y, full-index */
	let sw = shape.width;
	let sh = shape.height;
	let fw = current.width;
	let fh = current.height;

	var sum = 0; /* V8 opt bailout with let */

	for (sy=0; sy<sh; sy++) {
		fy = sy + offset.top;
		if (fy < 0 || fy >= fh) { continue; } /* outside of the large canvas (vertically) */

		for (sx=0; sx<sw; sx++) {
			fx = offset.left + sx;
			if (fx < 0 || fx >= fw) { continue; } /* outside of the large canvas (horizontally) */

			si = 4*(sx + sy*sw); /* shape (local) index */
			a = shapeData[si+3];
			if (a == 0) { continue; } /* only where drawn */

			fi = 4*(fx + fy*fw); /* full (global) index */

			a = a/255;
			b = 1-a;
			d1r = targetData[fi]-currentData[fi];
			d1g = targetData[fi+1]-currentData[fi+1];
			d1b = targetData[fi+2]-currentData[fi+2];

			d2r = targetData[fi] - (color[0]*a + currentData[fi]*b);
			d2g = targetData[fi+1] - (color[1]*a + currentData[fi+1]*b);
			d2b = targetData[fi+2] - (color[2]*a + currentData[fi+2]*b);

			sum -= d1r*d1r + d1g*d1g + d1b*d1b;
			sum += d2r*d2r + d2g*d2g + d2b*d2b;
		}
	}
  // console.log(`Sum is ${sum}`)
	return sum;
}

function computeColorAndDifferenceChange(offset, imageData, alpha){
  let rgb = computeColor(offset, imageData, alpha)
  let differenceChange = computeDifferenceChange(offset, imageData, rgb)
  let color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
  // console.log(`getting color ${color}`)
  return {color, differenceChange}
}

class Canvas{
  constructor(width, height){
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')
    this.imageData = null
  }

  static newLeftCanvas(config){
    if(config.temp == 'nothing'){ return Promise.resolve(this.newTestCanvas(config))}
    else{
      return new Promise(resolve => {
        let image = new Image()
        image.crossOrigin = true
        image.src = config.temp
        image.onload = e => {
          let computeScale = getScale(image.naturalWidth, image.naturalHeight, config.computeSize)
          let viewScale = getScale(image.naturalWidth, image.naturalHeight, config.viewSize)
          config.width = image.naturalWidth / computeScale
          config.height = image.naturalHeight / computeScale
          config.scale = computeScale / viewScale
          // console.log('Innnnn herererererere')
          // console.log(config)

          let canvas = newBlankCanvas(config)
          canvas.ctx.drawImage(image, 0, 0, config.width, config.height)

          if(config.fill == 'auto'){
            config.fill = getFillColor(canvas)
          }
          // debugger
          resolve(canvas)
        }
        image.onerror = e => {
          console.log(e)
          console.log('An error occured in loading the picture')
        }
      })
    }
  }

  static newTestCanvas(config){
    config.width = config.computeSize
    config.height = config.computeSize
    config.scale = 1
    let [w, h] = [config.computeSize, config.computeSize]
    let canvas = new Canvas(w, h)
    canvas.fillFull('#fff')
    let ctx = canvas.ctx

    //Make test shape
    ctx.fillStyle="#f00"
    ctx.beginPath()
    ctx.arc(w / 4, h / 2, w / 7, 0, 2 * Math.PI, true)
    ctx.fill()

    ctx.fillStyle="#0f0"
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, w / 7, 0, 2 * Math.PI, true)
    ctx.fill()

    ctx.fillStyle="#00f"
    ctx.beginPath()
    ctx.arc((3 * w) / 4, h / 2, w / 7, 0, 2 * Math.PI, true)
    ctx.fill()

    if(config.fill == 'auto'){
      config.fill = getFillColor(canvas)
    }
    return canvas
  }

  static newRightCanvas(leftCanvas, config){
    left.innerHTML = ''
    raster.innerHTML = ''
    stepsLabel.innerHTML = ''

    left.appendChild(leftCanvas.canvas)
    // debugger
    let optimizer = new Optimizer(leftCanvas, config)
    steps = 0

    // console.log('New right canvas')
    let newConfig = JSON.parse(JSON.stringify(config))
    // console.log('COoooooonfig')
    // console.log(config)
    newConfig.width = config.scale * config.width
    newConfig.height = config.scale * config.height
    // console.log(newConfig)
    let newCanvas = new Canvas(newConfig.width, newConfig.height).fillFull(newConfig.fill)
    newCanvas.ctx.scale(config.scale, config.scale)
    raster.appendChild(newCanvas.canvas)

    optimizer.onStep = (step) => {
      if(step){ //We can't have null here
        newCanvas.drawStepOnCanvas(step)
        // let percent = 
      }
    }
    optimizer.addShape()
  }

  fillFull(color){
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    return this
  }
  
  getImageData(){
    if(!this.imageData){
      this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }
    return this.imageData
  }

  diffCans(otherOne){
    return diffIt(this.getImageData(), otherOne.getImageData())
  }

  distCans(otherOne){
    let diff = this.diffCans(otherOne)
    return diff_dist(diff, this.canvas.width * this.canvas.height)
  }

  clone(){
    let newCanvas = new Canvas(this.canvas.width, this.canvas.height)
    newCanvas.ctx.drawImage(this.canvas, 0, 0)
    return newCanvas
  }

  drawStepOnCanvas(step) {
		this.ctx.globalAlpha = step.alpha
		this.ctx.fillStyle = step.color
		step.shape.paintShape(this.ctx)
		return this
	}

}

class State{
  constructor(left, right, dist = Infinity){
    this.left = left
    this.right = right
    this.distance = dist == Infinity ? left.distCans(right) : dist
  }
}

class Step{
  constructor(shape, config, state){
    this.shape = shape
    this.config = config
    this.alpha = config.alpha

    this.color = 'rgb(255, 0, 0)'
    this.distance = Infinity
    // if(state){
    //   return this.compute(state)
    // }
  }
  compute(state) {
		let pixels = state.right.canvas.width * state.right.canvas.height;
		let offset = this.shape.bbox;
		let imageData = {
      shape: this.shape.rasterize(this.alpha).getImageData(),
      target: state.left.getImageData(),
			current: state.right.getImageData()
    };
    // console.log('In step')
    // console.log(imageData)

    let {color, differenceChange} = computeColorAndDifferenceChange(offset, imageData, this.alpha);
    // console.log(`Diff change is ${differenceChange}`)
		this.color = color;
		let currentDifference = dist_diff(state.distance, pixels);
		if (-differenceChange > currentDifference) debugger;
		this.distance = diff_dist(currentDifference + differenceChange, pixels);
    // console.log(this.distance)
		return Promise.resolve(this);
  }
  
  mutateStep(){
    let newShape = this.shape.mutate(this.config)
    let newStep = new this.constructor(newShape, this.config)
    if(this.config.mutateAlpha){
      // If mutate alpha is active, mutate alpha as well
      newStep.alpha = inRange(this.alpha + (Math.random() - 0.5) * 0.08, 0.1, 1)
    }
    return newStep
  }
  applyStep(state){
    let newCanvas = state.right.clone().drawStepOnCanvas(this)
    return new State(state.left, newCanvas, this.distance)
  }
}

class Optimizer{
  constructor(leftCanvas, config){
    this.config = config
    this.state = new State(leftCanvas, newBlankCanvas(config))
    this.steps = 0
    this.onStep = () => {}
  }

  addShape(){
    // console.log('In add Shape')
    // console.log(this.state)
    this.getAShape().then(step => this.optimizeStep(step)).then(step => {
      // console.log(`Step dis ${step.distance} and state dis ${this.state.distance}`)
      // console.log('--------------------------------------------')
      // console.log('step is now >>>>>')
      // console.log(step)
      if(step.distance < this.state.distance){
        // console.log('Fount best step no ' + this.steps)
        // console.log(step)
        this.steps++
        this.state = step.applyStep(this.state)
        this.onStep(step)
      }
      else{
        this.onStep(null)
      }
      this.continue()
    })
  }
  continue(){
    if(this.steps < this.config.stepSize){
      setTimeout(() => this.addShape(), 10)
      // this.addShape()
    }
  }

  optimizeStep(step){
    // console.log('In optimize')
    // console.log(this.state)
    const MAX = this.config.mutateTimes
    let failedTimes = 0
    let totalTimes = 0
    let successTimes = 0
    let bestStep = step
    let resolve = null
    let promise = new Promise(res => resolve = res)

    let mutStep = () => {
      if(failedTimes >= MAX){
        console.log("mutation optimized distance from %s to %s in (%s good, %s total) attempts", arguments[0].distance, bestStep.distance, successTimes, totalTimes)
        return resolve(bestStep)
      }
      totalTimes++
      bestStep.mutateStep().compute(this.state).then(newStep => {
        if(newStep.distance > bestStep.distance){
          failedTimes++
          // console.log('Failed' + failedTimes)
        }
        else{
          // console.log('Passed step-------')
          bestStep = newStep
          failedTimes = 0
          successTimes++
        }
        mutStep()
      })
    }
    mutStep()
    return promise
  }

  getAShape(){
    const MAX = this.config.beginShapes
    let best
    let allPromises = []
    for(let i = 0; i < MAX; i++){
      let shape = Shape.create(this.config)
      let promise = new Step(shape, this.config).compute(this.state).then(step => {
        // console.log('Each step')
        // console.log(step)
				if(!best || step.distance < best.distance){
					best = step
				}
			})
			allPromises.push(promise);
    }
    return Promise.all(allPromises).then(() => best)
  }
}

class Shape{
  static create(config){
    let index = Math.floor(Math.random() * config.shapes.length) //Random shape out of the shapes array
    let shapeName = config.shapes[index]
    // console.log(`Index >> ${index}`)
    // console.log(config.shapes)
    return new shapeName(config.width, config.height)
  }
  constructor(width, height, num){
    this.bbox = {}
    if(num){
      this.points = this.createPoints(width, height, num)
      this.computeBbox()
    }
  }

  static randomPoint(width, height){
    return [~~(Math.random() * width), ~~(Math.random() * height)]
  }
  createPoints(width, height, num){
    let point = Shape.randomPoint(width, height)
    let points = [point]
    for(let i = 0; i < num - 1; i++){
      let angle = Math.random() * 2 * Math.PI
      let dist = Math.random() * 20 //20 is the base dist
      points.push([
        point[0] + ~~(dist * Math.cos(angle)), // cos = point.x / radius
        point[1] + ~~(dist * Math.sin(angle)) // sin = point.y / radius
      ])
    }
    return points
  }

  computeBbox(){
    let min = [
      this.points.reduce((acc, point) => Math.min(point[0], acc), Infinity), //get lowest x
      this.points.reduce((acc, point) => Math.min(point[1], acc), Infinity)  // get lowest y
    ]
    let max = [
      this.points.reduce((acc, point) => Math.max(point[0], acc), -Infinity), //get highest x
      this.points.reduce((acc, point) => Math.max(point[1], acc), -Infinity)  // get highest y
    ]
    this.bbox = {
      top: min[1],
      left: min[0],
      width: (max[0] - min[0]) || 1,
      height: (max[1] - min[1]) || 1
    }
    return this
  }

  paintShape(ctx){
    ctx.beginPath()
    this.points.forEach((point, index) => {
      if(index == 0){
        ctx.moveTo(point[0], point[1])
      }
      else{
        ctx.lineTo(point[0], point[1])
      }
    })
    ctx.fill()
    ctx.closePath()
  }

  mutate(config){
    // console.log('This is =-----------')
    // console.log(this)
    let copy = new this.constructor(0, 0)
    copy.points = JSON.parse(JSON.stringify(this.points))

    let randomIndex = Math.floor(Math.random() * copy.points.length)
    let randomPoint = copy.points[randomIndex]
    let randomAngle = Math.random() * 2 * Math.PI
    let randomDist = Math.random() * 20
    randomPoint[0] += ~~(randomDist * Math.cos(randomAngle))
    randomPoint[1] += ~~(randomDist * Math.sin(randomAngle))
    
    return copy.computeBbox()
  }

  rasterize(alpha){
    let newCanvas = new Canvas(this.bbox.width, this.bbox.height)
    let ctx = newCanvas.ctx
    ctx.fillStyle = '#f33'
    ctx.globalAlpha = alpha
    ctx.translate(-this.bbox.left, -this.bbox.top)
    this.paintShape(ctx)
    return newCanvas
  }
}

class Triangle extends Shape{
  constructor(width, height){
    super(width, height, 3)
  }
}

class Rectangle extends Shape{
  constructor(width, height){
    super(width, height, 4)
  }
  // createPoints(width, height, num){
  //   let p1 = 
  // }
}


function getScale(wid, hei, siz){
  return Math.max(wid / siz, hei / siz, 1)
}

const shapeClasses = {
  "Triangles": Triangle,
  "Rectangles": Rectangle,
  // "Ellipses": Ellipse
}