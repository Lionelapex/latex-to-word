export const SAMPLES = {
  probability: {
    label: "Probability & statistics",
    text: `## 1.2 Difference Between Empirical and Theoretical Probability

Empirical probability is calculated from actual observations.

\\[
P(E) =
\\frac{\\text{Number of times an event occurs}}
{\\text{Total number of trials or observations}}
\\]

The theoretical probability is:

\\[
P(E) =
\\frac{\\text{Number of favorable outcomes}}
{\\text{Total number of possible outcomes}}
\\]

For the sample:

\\[
\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n}x_i
\\]

The standard deviation is:

\\[
s =
\\sqrt{
\\frac{
\\sum_{i=1}^{n}(x_i-\\bar{x})^2
}{
n-1
}
}
\\]

| Variable        | Symbol    | Value      |
| --------------- | --------- | ---------- |
| Population mean | $\\mu$     | $1.000$ kg |
| Sample mean     | $\\bar{x}$ | $1.135$ kg |
| Sample size     | $n$       | $100$      |
`,
  },
  skewness: {
    label: "Skewness interpretation",
    text: `## 1.3 Skewness of Data and Its Interpretation

- **Symmetrical distribution:** tail lengths on both sides are equal.
- **Positively skewed:** longer tail on the right; most values cluster on the left.

$$ Mean = Median = Mode $$

The data is approximately symmetric when the three measures of central tendency are equal.

$$ Mean > Median > Mode $$

The distribution is positively skewed.

$$ Mean < Median < Mode $$

The tail on the left side of the distribution is longer; most values cluster on the right.
`,
  },
  coffee: {
    label: "Coffee creamer case study (table)",
    text: `## 1.4 Coffee Creamer Case Study

| Question | Description | Symbol | Value / Expression |
| --- | --- | --- | --- |
| 1.4.1 | Random variable of interest | $X$ | Weight of a jar of coffee creamer (in kg) |
| 1.4.2 | Population size | $N$ | $N = 13,335$ jars |
| 1.4.3 | Population average (mean) | $\\mu$ | $\\mu = 1.000\\text{ kg}$ |
| 1.4.4 | Sample size | $n$ | $n = 100$ jars |
| 1.4.5 | Sample average (mean) | $\\bar{x}$ | $\\bar{x} = 1.135\\text{ kg}$ |
`,
  },
};

export const DEFAULT_SAMPLE_KEY = "probability";
