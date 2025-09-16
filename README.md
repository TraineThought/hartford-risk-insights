# Hartford Risk Insights

Hartford Risk Insights is an interactive data dashboard built with **React, TypeScript, and Vite**.  
It provides county-level insights for Connecticut, including filters, charts, and exportable reports.

---

## 🚀 Features

- 📊 **Interactive charts** – visualize data with dynamic filtering  
- 🗂️ **County-level filters** – select one or multiple CT counties  
- 📝 **Saved views** – store and reload custom filter sets  
- 📄 **Export to PDF** – generate reports with filters, charts, and summaries  
- 🌐 **Deployed on Netlify** – automatic builds from GitHub  

---

## 🛠️ Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)  
- [Vite](https://vitejs.dev/) for fast builds  
- [Zustand](https://github.com/pmndrs/zustand) for state management  
- [Leaflet](https://leafletjs.com/) for interactive maps  
- [PapaParse](https://www.papaparse.com/) for CSV handling  
- [jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/bubkoo/html-to-image) for PDF export  

---

## 📂 Project Structure

hartford-risk-insights/
├── apps/
│   └── risk-insights/      # Main frontend app
│       ├── src/
│       │   ├── features/   # Charts, tables, map, filters
│       │   ├── lib/        # Store, utilities
│       │   ├── styles/     # CSS tokens + themes
│       │   └── main.tsx    # App entry
├── netlify.toml            # Netlify build config
└── package.json

---

## ⚙️ Development

1. Clone the repo:
   ```bash
   git clone https://github.com/TraineThought/hartford-risk-insights.git
   cd hartford-risk-insights/apps/risk-insights

	2.	Install dependencies:

npm install


	3.	Run locally:

npm run dev


	4.	Build for production:

npm run build



⸻

🌍 Deployment

This project is automatically deployed on Netlify.
Build settings are configured via netlify.toml:
	•	Base directory: apps/risk-insights
	•	Build command: npm run build
	•	Publish directory: dist

Production site: https://hartford-risk-insights.netlify.app 

⸻

📜 License

MIT License © 2025 TraineThought
