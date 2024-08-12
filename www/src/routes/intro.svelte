<style>
	table {
		width: 100%;
		max-width: 40em;
	}
</style>

<h2>Fourier Transform Cube</h2>

<p>
	The goal of this tool is to build an intuitive and interactive understanding of the properties of the Fourier Transform. The Fourier transform is a mathematical tool to analyze complex signals like audio waves be decomposing them into simpler parts. Below some interesting aspects of the Fourier Transform are pointed out. To fully understand how the Fourier Transform works some more mathematical rigor is required and there are many explanations that can be found online or in text books. 
</p>

<p>
	But even after studying and understanding the formal details it might be helpful take a step back and take a more playful look at what is happening. This is where is tool comes in.
</p>

<h3>The sides of the cube</h3>

<p>
	The front side of the cube shows the plot of a complex valued signal. Due to symmetry it does not matter much which side you chose as the front. The neighbouring faces show the same signal but transformed into the frequency domain. The fourier transform is a 4-cyclic operation. After applying it 4 times it yields the original signal again. In this sense the 4 sides of the cube represent the same signal from 4 different perspectives.
</p>

<p>
	The top face of cube shows another plot of the signal but this one can interpolate between all the 4 perspectives. The Fractional Fourier Transform allows to apply the Fourier Transform a fractional number of times. By moving the <em>Fractional DFT</em> slider one can observe how the time domain signal slowly morphes into the frequency domain representation.
</p>

<p>
	The signal in time domain is called <code>f(t)</code>. The fourier transformed signal in frequency domain is called <code>F(ω)</code>. The relation is written as <code>f(t) ⊶ F(ω)</code>.
</p>


<h3>Fourier Transform</h3>
<p>
	The Fourier Transform is a linear transformation that decomposes a signal <code>f(t)</code> into harmonically oscillating components <code>F(ω)</code>, ie. it determines what <code>A&sdot;cos(ω&sdot;t)</code> and <code>B&sdot;sin(ω&sdot;t)</code> functions need to be summed together to trconstruct the signal <code>f(t)</code>. <code>sin</code> is an odd function and <code>cos</code> is an even function. The sum of only odd functions is itself an odd function. The sum of only even functions is an even function. To construct any signal that is neither even nor odd sin and cos components need to be mixed. 
</p>

<p>
	Both functions <code>A&sdot;cos(ω&sdot;t)</code> and <code>B&sdot;sin(ω&sdot;t)</code> can be precombined into a single expression by making use of eulers identity <code>exp(i&sdot;w&sdot;t) = cos(ω&sdot;t) + i&sdot;sin(ω&sdot;t)</code>. This simplifies and unifies all the calculations. So in the general case the Fourier transform decomposes a signal <code>f(t)</code> into a weighted sum of <code>exp(i&sdot;w&sdot;t)</code> terms.
</p>

<p>
	Interestingly the fourier transform is a 4-cyclic operation. This means that applying the the transform 4 times in a row will lead back to the original signal. This is why this visualization is built around a cube. One side of the cube shows the original signal in its time domain. The right neighbouring side shows the fourier transformed signal in its frequency domain. The backside (right to the face right to the original) shows the result of applying the fourier transform again and the fourth side (left to the front, or right to the back side when seen from behind) will show the result of applying the fourier transform 3 times.
</p>

<p>
	Notice how opposite sides of the cube show almost the same signal. This is called the <em>time reversal</em> property of the fourier transform: applying the transformation twice has the same effect as reversing the signal along the time axis.
</p>

<h3>Discrete Fourier Transform</h3>

<p>
	Actually are 4 different kinds of fourier transforms. Which one is the correct one to use depends on 2 factors:
</p>

<ul>
	<li>Is the signal periodic or aperiodic</li>
	<li>Is the time dimension continous (real valued) or discrete</li>
</ul>

<p>
	In total these two factors yield 4 combinations:
</p>

<table cellpadding="20">
	<thead>
		<tr>
			<th></th>
			<th>periodic</th>
			<th>aperiodic</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<th>discrete</th>
			<td align="center" bgcolor="#ffffcc">Discrete<br>Fourier Transform<br>(DFT)</td>
			<td align="center">Discrete Time<br>Fourier Transform<br>(DTFT)</td>
		</tr>
		<tr>
			<th>continous</th>
			<td align="center">Fourier<br>Series<br>(FS)</td>
			<td align="center">Fourie<br>Transform<br>(FT)</td>
		</tr>
	</tbody>
</table>

<p>On real world computer systems (like this one) only discrete periodic signals can be represented. Continous time signals would require infinite resolution and non-periodic signals would require infintie memory. Finite signals, like 3 minute music recording are simply assumed to be periodic. This implicit assumtion is made by trying to decompose the signal into finitely many periodic sin(t)/cos(t)/exp(it) components in the first place.</p>

<p>
	So when calculating the Fourier Transform on a computer it is implicitly assumed to be the Discrete Fourier Transform (DFT).
</p>

<p>
	The assumption of the signal being cyclic is emphasized by the <em>Cyclic Axis</em> option.
</p>

<p>
	For discrete time signals the frequency domain periodic as shown by the table below:
</p>

<table width="400">
	<thead>
		<tr>
			<th width="45%">time domain</th>
			<th width="10%"></th>
			<th width="45%">frequency domain</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td align="center">periodic</td>
			<td align="center">⊶</td>
			<td align="center">discrete</td>
		</tr>
		<tr>
			<td align="center">discrete</td>
			<td align="center">⊶</td>
			<td align="center">periodic</td>
		</tr>
		<tr>
			<td align="center">a-periodic</td>
			<td align="center">⊶</td>
			<td align="center">continous</td>
		</tr>
		<tr>
			<td align="center">continous</td>
			<td align="center">⊶</td>
			<td align="center">a-periodic</td>
		</tr>
	</tbody>
</table>

<h3>Fourier Transform Pairs</h3>

<p>
	Applying a Fourier Transform translates a signal from the time domain into the frequency domain. In the time domain the signal maps each point in time to scalar value (a real or complex number) representing an an intensity. In the frequency domain the fourier transformed signal maps each frequency (the so called frequency bin) to a scalar value (real or complex) representing how strong a sin/cos/exp function of that frequency would need to be to reconstruct the signal (the so called coefficients).
</p>

<p>
	But not only signals themself can be fourier transformed. It can also be reasoned about how modifying a signal in time domain (eg. scaling or offsetting it) will effect its frequency representation. The relations between modifications in time domain and in frequency domain can be summarized as:
</p>

<table cellpadding="20" width="400">
	<thead>
		<tr>
			<th></th>
			<th>In time domain</th>
			<th>In frequency domain</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<th>Linearity</th>
			<td>Scaling the signals magnitudes in time domain by constant factor <code>x</code></td>
			<td>Scaling the signals magnitudes in frequency domain by constant factor <code>x</code></td>
		</tr>
		<tr>
			<th>Linearity</th>
			<td>Adding a constant angle <code>𝛼</code> to the signals complex values at each point in time.</td>
			<td>Adding a constant angle <code>𝛼</code> to the signals complex coefficients at each frequency bin.</td>
		</tr>
		<tr>
			<th>Time scaling</th>
			<td>Stretching the signal along the time axis in time domain.</td>
			<td>Compressing the coefficients in the frequency domain along the frequency axis.</td>
		</tr>
		<tr>
			<th>Time scaling</th>
			<td>Compressing the signal along the time axis.</td>
			<td>Stretching the coefficients in the frequency domain along the frequency axis.</td>
		</tr>
		<tr>
			<th>Time shifting</th>
			<td>Shifting the signal forwards or backwards along the time axis by <code>t</code> time steps.</td>
			<td>Adding an angle <code>t&sdot;ω</code> to each frequency coefficient proportial to the bins frequency <code>ω</code></td>
		</tr>
		<tr>
			<th>Frequency shifting</th>
			<td>Adding an angle <code>t*𝛼</code> to each signals value at time <code>t</code></td>
			<td>Shifting the signals frequency coefficients upwards or downwards along the frequency axis by <code>𝛼</code> time steps.</td>
		</tr>
	</tbody>
</table>

<p>
	These symmetries can be observed by modifying the signals parameters while looking at the cube from different sizes.
</p>

<h3>Fractional Fourier Transform</h3>

<p>
	The fourier transform is a 4-cyclic operation. Applying the fourier transform 0,1,2, or 3 times can be though of as looking at the signal from 4 different perspectives.
</p>
<p>
	Depending of the perspective the signal span either across the time axis or across the frequency axis. We can think of these two axis as spanning a plane on which the signal exists. This plane is the so called time-frequency-plane. The fourier transform rotates the signal inside this plane by 90 degree.
</p>
<p>
	When thinking of the fourier transform as an 90 degree rotation in some abstract space the question comes up if we could also rotate by angles other than 90 degrees. This would correspond to applying the fourier transform not 0,1,2, or 3 times but instead 0.1 or 1.25 times.
</p>

<p>
	This is actually possible by using the fractional fourier transform. The fractional fourier transform is an extension of the classical fourier transform.
</p>

<p>
	The fractional fourier transform allows to smoothly interpolate between the time and the frequency domain. You can see this when looking at the top facing side of the cube and moving the <em>Fraction DFT</em> slider from 0 to 1.
</p>