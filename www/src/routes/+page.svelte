<svelte:head>
	<title>Fractional Discrete Fourier Transform</title>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import { createScene } from "./scene";
  import Introduction from "./intro.svelte";
  import { Signal, __wbg_set_wasm }  from 'fftwasm/fftwasm_bg.js'
  import * as wasm   from 'fftwasm/fftwasm_bg.wasm'

  __wbg_set_wasm(wasm)

  const decimalFormat = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const decimalFormatSigned = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' })
  const intFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, signDisplay: 'exceptZero' })
  const samples = 512
  const signal = Signal.new(samples)
  const customRecording = new Float32Array(2*signal.get_len())

  const maxFreq = samples/2

  let el;
  let camFrame;
  let scene = null
  let snap = false
  let fraction = 0
  let cepstrum = 0
  let freq = 0
  let phase = 0
  let amplitude = 1
  let shape = 'rect'
  let timeShift = 0
  let timeStretch = 0
  let circular = false
  let showInfo = false
  let demoMode = false
  let syncRot = false
  let timeDomain = new Float32Array(wasm.memory.buffer, signal.get_time(), 2*signal.get_len())
  let freqDomain = new Float32Array(wasm.memory.buffer, signal.get_freq(), 2*signal.get_len())
  let fracDomain = new Float32Array(wasm.memory.buffer, signal.get_frac(), 2*signal.get_len())

	function sinc(x) {
		return x==0?1:Math.sin((Math.PI/2)*x)/((Math.PI/2)*x)
	}

	let r = 0, rx, ry, ra, rc = 0, rbs
	let recField
	function record(evt) {
		if(!recField) return
		let x = (evt.pageX - recField.offsetLeft) / recField.offsetWidth
		let y = (evt.pageY - recField.offsetTop) / recField.offsetHeight

		rx = 2*(x*2 - 1)
		ry = -2*(y*2 - 1)
	}


	function recordTouch(evt) {
		if(!recField) return
		let x = (evt.touches[0].pageX - recField.offsetLeft) / recField.offsetWidth
		let y = (evt.touches[0].pageY - recField.offsetTop) / recField.offsetHeight

		rx = 2*(x*2 - 1)
		ry = -2*(y*2 - 1)
	}

	function recordClear() {
		r = samples/2
		customRecording.fill(0);
		customRecording[0] = 0
	}
	recordClear()

	function recordDo() {
		r = (r+samples+1)%samples;
		ra = requestAnimationFrame(recordDo)
		if((rbs & 4) == 4) {
			customRecording[2*r] = Math.sign(ry) * Math.sqrt(Math.abs(ry))
			customRecording[2*r+1] = Math.sign(rx) * Math.sqrt(Math.abs(rx))
		} else {
			customRecording[2*r] = ry
			customRecording[2*r+1] = rx
		}
	}

	function recordStart(evt) {
		evt.preventDefault()
		if(rc++ > 0) return
		rbs |= (1<<evt.button)
		recordDo()
	}

	function recordStop(evt) {
		if(rc < 1) return
		rbs = rbs & ~(1<<evt.button)
		if(--rc > 0) return
		evt.preventDefault()
		cancelAnimationFrame(ra)
		ra = null
	}

  const shapes = {
  	constant: (x) => 1,
  	dirac: (x) => x==0 ? 1 : 0,
  	dirac_pair: (x, minx) => ((minx < 1 && x==0) || Math.abs(x)==1) ? 1 : 0,
  	cos: (x) => Math.cos(Math.PI/2*x),
  	rect: (x) => Math.abs(x)<=1 ? 1 : 0,
  	sinc: (x) => !isFinite(x)?0:sinc(x),
  	gauss: (x) => !isFinite(x)?0:Math.exp(-0.5*x*x*Math.sqrt(2)),
  	sha: (x) => (1.5*x)%1==0 ? 1 : 0,
  	saw: (x) => ((x/2+0.5)%1+1)%1,
  	tri: (x) => Math.abs(((Math.abs(x))%2+2)%2-1),
  	exp: (x) => Math.exp(-Math.abs(x)/(Math.sqrt(2)*0.5)),
  	couchy: (x) => (Math.sqrt(2)*0.5)/(x*x+(Math.sqrt(2)*0.5)),
  	chirp: (x) => Math.cos(x*x/4*Math.PI),
  }

  const transformPairs = {
  	'constant': 'dirac',
  	'dirac': 'constant',
  	'dirac_pair': 'cos',
  	'cos': 'dirac_pair',
  	'gauss': 'gauss',
  	'sha': 'sha',
  	'exp': 'couchy',
  	'couchy': 'exp',
  }

  function swapShape(evt) {
  	evt.preventDefault()
  	shape = transformPairs[shape]
  }

  $: timeStetchExp = Math.pow(2,timeStretch+2)

  $: if(scene) {
  	if(shape !== "") {
	  	for(let i=0;i<samples;i++) {
	  		const t = (i/samples-0.5);
	  		const mag = amplitude*shapes[shape](timeStetchExp*t*16, samples/(timeStetchExp*16))
	  		const phi = Math.PI*2*(freq*2*t+phase/360)

	  		timeDomain[(2*i-2*timeShift+samples*2)%(samples*2)] = mag * Math.cos(phi)
	  		timeDomain[(2*i+1-2*timeShift+samples*2)%(samples*2)] =  mag * Math.sin(phi)
	  	}
  	} else {
  		for(let i=0;i<samples;i++) {
  			timeDomain[2*i] = customRecording[2*i]
  			timeDomain[2*i+1] = customRecording[2*i+1]
  		}
  	}

  	signal.update_freq_with_cepstrum(cepstrum)
  	signal.update_frac(fraction)

  	scene.setFractionalRotation(fraction * Math.PI/2)
  }

  $: {
  	if(timeDomain.byteLength === 0) {
	  	timeDomain = new Float32Array(wasm.memory.buffer, signal.get_time(), 2*signal.get_len())
		  freqDomain = new Float32Array(wasm.memory.buffer, signal.get_freq(), 2*signal.get_len())
		  fracDomain = new Float32Array(wasm.memory.buffer, signal.get_frac(), 2*signal.get_len())
	  	
	  	scene.setSignal(timeDomain)
	  	scene.setSpectrum(freqDomain)
	  	scene.setFractional(fracDomain)
	  }
  }

  $: {
  	if(scene) {
  		scene.setPolar(circular)
  	}
  }

  $: if(scene) {
  	scene.setSignal(timeDomain)
  	scene.setSpectrum(freqDomain)
  	scene.setFractional(fracDomain)
  }

  function getPathA(cx,r){
	  return "M" + cx + ",";
	}
  function getPathB(cy,r){
	  return cy + "m" + (-r) + ",0a" + r + "," + r + " 0 1,0 " + (r * 2) + ",0a" + r + "," + r + " 0 1,0 " + (-r * 2) + ",0";
	}

  $: paintPath = customRecording.reduce((acc, n, i) => acc+(i%2==0?getPathA(n,.03):getPathB(n,.03)),"")
  $: paintPathEmpty = !Array.prototype.some.call(customRecording, (a) => a != 0)

  $: if(scene) {
  	scene.onRotationChange(function(r) {
	  	if(syncRot) {
	  		const delta = Math.abs(Math.round(r) - r)
	  		if(delta < 0.02) {
	  			fraction = Math.round(r) - 2
	  		} else {
	  			fraction = r - 2
	  		}
	  	}
	  })
  }

  onMount(() => {
    scene = createScene(el, camFrame)

    return scene.dispose
  });
</script>

<svelte:window on:mousemove={record} on:touchmove={recordTouch} on:mouseup={recordStop} on:touchend={recordStop} on:touchcancel={recordStop} />

<style>
	:global(body) {
		margin: 0;
		background: #effbff;
	}

	:global(html) {
		margin: 0;
		scrollbar-width: thin;
	}

	.canvas {
		grid-area: canvas;
		scrollbar-gutter: stable;
		display: block;
		position: fixed;
		width: 100%;
		height: 100%;
		inset: 0;
		background: #effbff;
		background: linear-gradient(#effbff, #cff9ff);
		user-select: none;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: rgba(255, 255, 255, 0); /* mobile webkit */
	}

	.container {
		position: absolute;
		inset: 0;
		display: block;
		display: grid;
		place-content: stretch;
	}

	@media(min-width: 800px) {
		.container {
			grid-template-columns: [canvas-start controls-start] minmax(20em, min-content) [controls-end cam-start] 10fr [canvas-end cam-end];
			grid-template-rows: [controls-start canvas-start cam-start] 1fr [controls-end canvas-end cam-end];
		}
	}

	@media(max-width: 800px) {
		.container {
			grid-template-rows: [canvas-start cam-start] 7fr [controls-start cam-end] 3fr [controls-end canvas-end];
			grid-template-columns: [controls-start canvas-start cam-start] 1fr [controls-end canvas-end cam-end];
		}
	}

	.cam-frame {
		grid-area: cam;
		pointer-events: none;
		place-self: stretch;
		opacity: 0.1;
	}

	.controls {
		box-sizing: border-box;
		z-index: 10;
		align-self: start;
		justify-self: start;
		padding: 1em;
		font-family: monospace;
		font-size: 1.2em;
		overflow: auto;
		grid-area: controls;
		justify-self: stretch;
		margin: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
	}

	.controls-inner {
		padding: 1em;
		min-width: 12em;
		background: #000a;
		color: #fff;
	}

	fieldset {
		border: none;
		padding: 0;
	}

	hr {
		border: none;
		border-bottom: 1px solid #0004;
	}

	label {
		user-select: none;
	}

	output {
		display: inline-block;
		width: 4em;
		margin-left: auto;
		text-align: right;
	}

	legend {
		font-weight: bold;
		margin: 0 0 1em 0;
		padding: 2px 4px;
	}

	input {
		accent-color: white;
	}

	input:checked {
		accent-color: black;
	}

	.recorder {
		width: 100%;
		aspect-ratio: 1;
		background: #000a;
		border: 2px solid #fffa;
		display: grid;
		align-content: stretch;
		justify-content: stretch;
		margin-top: 0.5em;
	}

	.recorder > * {
		pointer-events: none;
		user-select: none;
		opacity: 0.4;
		grid-column: 1 / span 1; 
		grid-row: 1 / span 1;
		align-self: stretch; 
		justify-self: stretch;
		text-align: center;  
		display: grid;
	  align-content: center;
	  justify-content: center;
	  width: 100%;
	  height: 100%;
	}

	input[type=range] {
		width: 100%;
	}

	.checkbox-list {
		display: flex;
		flex-direction: column;
	}

	.info-button {
		display: inline-block;
		padding: 0.2em;
		background: none;
		font: inherit;
		border: none;
		color: inherit;
		text-decoration: underline;
		cursor: pointer;
	}

	.help-container {
		position: absolute;
		inset: 0;
		bottom: initial;
		background: #000a;
		display: grid;
		place-content: stretch;
		overflow: auto;
		scrollbar-gutter: stable;
		padding: 4em 1em;
		z-index: 1000;
	}

	.help-box {
		background: #fff;
		width: 90vw;
		box-sizing: border-box;
		min-height: 50vh;
		display: block;
		justify-self: center;
		align-self: start;
		color: #000;
		padding: 1em;
		overflow: auto;
	}

	select, button {
		font: inherit;
		font-size: inherit;
		white-space: nowrap;
		line-height: 1;
	}

	.hide {
		display:  none;
	}

	.demo {
		grid-template-columns: [canvas-start controls-start cam-start] 1fr [controls-end canvas-end cam-end];
		grid-template-rows: [controls-start canvas-start cam-start] 1fr [controls-end canvas-end cam-end];
	}
</style>

<div class="container" class:demo={demoMode}>
	<canvas unselectable class="canvas" bind:this={el}></canvas>
	<div class="cam-frame" bind:this={camFrame}></div>
	<div class="controls" class:hide={demoMode}>
		<div class="controls-inner">
			<fieldset>
				<legend style="white-space: nowrap;">Fractional Discrete <br>Fourier Transform</legend>

					<label for="signal_shape">Shape:</label><br>
					<span style:display="flex" style:gap="0.2em">
						<select id="signal_shape" bind:value={shape}>
							{#each Object.keys(shapes) as s}
						<option value={s}>{s}</option>
							{/each}
						<option value={"---"} disabled="disabled">---</option>
						<option value={""}>custom</option>
						</select>
						{#if !!transformPairs[shape]}
						<button type="button" on:click={swapShape} style="cursor: pointer;">⊶ {transformPairs[shape]}</button> 
						{/if}
						{#if !shape}
						<button type="button" on:click={recordClear} style="cursor: pointer;">clear</button> 
						{/if}
					</span>
					{#if shape}
					<div>
						
						<br>
						<label for="control_amplitude"><span style:display="flex" style:gap="0.2em" style:white-space="nowrap">Amplitude:  <output>{decimalFormat.format(amplitude)}</output></span>
							<input list={snap?"ampl-list":null} type="range" min="0" max="2" step="0.01" bind:value={amplitude} id="control_amplitude"></label><br>
							<hr>
							<label for="control_timeStretch"><span style:display="flex" style:gap="0.2em" style:white-space="nowrap">Time Stretch: <output>{((true||snap)?intFormat:decimalFormat).format(timeStretch)}</output></span>
								<input type="range" min="-5" max="5" step={(true||snap)?1:0.01} bind:value={timeStretch} id="control_timeStretch">
							</label>
							<label for="control_timeShift"><span style:display="flex" style:gap="0.2em" style:white-space="nowrap">Time Shift: <output>{intFormat.format(timeShift)}</output></span>
								<input list={snap?"freq-list":null} type="range" min="-{samples*3/4}" max="{samples*3/4}" step="1" bind:value={timeShift} id="control_timeShift">
							</label>

						<hr>
						<label for="control_phase"><span style:display="flex" style:gap="0.2em" style:white-space="nowrap">Constant Phase: <output>{intFormat.format(phase)}°</output> </span>

							<input list={snap?"phase-list":null} type="range" min="-180" max="180" step="5" bind:value={phase} id="control_phase"></label>


						<label for="control_freq"><span style:display="flex" style:gap="0.2em" style:white-space="nowrap">Linear Phase:  <output>{intFormat.format(freq)}</output> </span>

							<input list={snap?"freq-list":null} type="range" min="-{maxFreq*3/4}" max="{maxFreq*3/4}" step="1" bind:value={freq} id="control_freq"></label>

					</div>
					{:else}
					<div role="presentation" bind:this={recField} class="recorder" on:contextmenu|preventDefault on:mousedown={recordStart} on:touchstart={recordStart}>
						{#if !paintPathEmpty}
						<svg viewBox="-2 -2 4 4" width="100" height="100">
							<path transform="rotate(-90, 0, 0)" d={paintPath} fill="white" stroke="none" />
						</svg>
						{:else}
						<span>Click and<br>Drag here</span>
						{/if}
					</div>
					{/if}
					
				<hr>

				<label for="control_fraction">
					<span style:display="flex" style:gap="0.2em" style:white-space="nowrap">Fractional DFT: <output>{decimalFormatSigned.format(fraction)}</output></span>
					<input disabled={syncRot} list={snap?"frac-list":null} type="range" min="-4" max="4" step="0.01" bind:value={fraction} id="control_fraction"></label>
					
					<label><input type="checkbox" bind:checked={syncRot}> Sync to cam</label>
				<hr>

				<label for="control_cepstrum">
					<span style:display="flex" style:gap="0.2em" style:white-space="nowrap">Cepstrum: <output>{decimalFormatSigned.format(cepstrum)}</output></span>
					<input type="range" min="0" max="1" step="0.01" bind:value={cepstrum} id="control_cepstrum"></label>
									<hr>
				<strong>View</strong><br>
				<div class="checkbox-list">
					<label><input type="checkbox" bind:checked={circular}> Cyclic axis</label>
					<label><input type="checkbox" bind:checked={snap}> Snap Controls</label>
				</div>
				<hr>

				<small>&sdot;<button type="button" class="info-button" on:click={() => showInfo = true} on:keydown={() => showInfo = true}>Info</button></small>
				<br>
				<small>&sdot;<a class="info-button" href="https://www.youtube.com/watch?v=Xe2Ob1gPqlg">Video Showcase</a></small>
				<br>
				<small>&sdot;<a class="info-button" href="//tools.laszlokorte.de" target="_blank">More educational tools</a></small>

				<datalist id="ampl-list">
					<option>0</option>
					<option>1</option>
				</datalist>

				<datalist id="freq-list">
					<option>0</option>
				</datalist>
				<datalist id="phase-list">
					<option>0</option>
				</datalist>
				<datalist id="frac-list">
					<option>0</option>
					<option>-1</option>
					<option>-2</option>
					<option>-3</option>
					<option>-4</option>
				</datalist>
			</fieldset>
		</div>
	</div>
</div>
{#if showInfo && !demoMode}
<div class="help-container" aria-hidden="true" on:click={() => showInfo = false} role="button" tabindex="-1">
	<div tabindex="-1" class="help-box" aria-hidden="true" on:click|stopPropagation on:keydown|stopPropagation>
		<button tabindex="-1" type="button" class="info-button" on:click={() => showInfo = false} on:keydown={() => showInfo = false}>Close</button>

		<Introduction />

		<hr>


			<label><input type="checkbox" bind:checked={demoMode}> Demo Mode (Reload to exit)</label>

	</div>

</div>
{/if}