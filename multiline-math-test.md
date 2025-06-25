# Multi-line LaTeX Math Test

This file tests various forms of LaTeX math rendering, including multi-line expressions.

## Inline Math

Simple inline math: $E = mc^2$

More complex inline: $\sum_{i=1}^{n} x_i = \frac{a + b}{c}$

## Single-line Display Math

$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

## Multi-line Display Math

Here's the quadratic formula with newlines:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

A system of equations:

$$
\begin{cases}
x + y = 1 \\
2x - y = 3
\end{cases}
$$

Matrix with multiple lines:

$$
\begin{pmatrix}
a & b & c \\
d & e & f \\
g & h & i
\end{pmatrix}
$$

Integration by parts:

$$
\int u \, dv = uv - \int v \, du
$$

Long summation:

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

## Mixed Content

Text before math $$
\lim_{x \to \infty} \frac{1}{x} = 0
$$ and text after.

Another example with spacing:

$$

f(x) = \begin{cases}
x^2 & \text{if } x \geq 0 \\
-x^2 & \text{if } x < 0
\end{cases}

$$

## Complex Multi-line Expression

$$
\begin{align}
\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &= \frac{4\pi}{c}\vec{\mathbf{j}} \\
\nabla \cdot \vec{\mathbf{E}} &= 4 \pi \rho \\
\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} &= \vec{\mathbf{0}} \\
\nabla \cdot \vec{\mathbf{B}} &= 0
\end{align}
$$

This should all render properly with KaTeX!