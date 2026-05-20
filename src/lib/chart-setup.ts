import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js'

// Register Chart.js modules once, shared across all ledger bar charts.
// Each chart component imports this module; Chart.js deduplicates registrations
// so calling register from a shared location avoids redundant module evaluation.
ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)
