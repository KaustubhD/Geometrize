let output = document.getElementById('output')
let typesRadio = document.querySelectorAll('input[name="type"]')
console.log(typesRadio)

function init(){
  // let typesRadio = document.querySelectorAll('input[name="type"]')
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
  let fileIn = document.getElementById('file-input')
  let fileURL = document.getElementById('file-url')
  let temp = 'nothing'
  if(fileIn.length > 0){
    url = URL.createObjectURL(fileIn.files[0])
  }
  else if(fileURL.value){
    url = fileURL.value
  }

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
    if(el.checked){ config['shapes'].push(el.value)}
  })

  form.querySelectorAll('[name="fillOption"]').forEach(el => {
    if(el.checked){ 
      if(el.value == 'auto'){ config['fill'] = 'auto' }
      else{ config['fill'] = el.querySelector('[name="fillColor"]').value }
    }
  })

  return config

}