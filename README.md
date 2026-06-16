# BigQuery Release Notes Dashboard

A modern, high-end web application built with **Python Flask** and **Vanilla Frontend (HTML/JS/CSS)** that fetches, parses, and visualizes the official Google Cloud BigQuery release notes feed. It enables users to browse, search, filter, and share individual release notes directly on X (Twitter).

---

## ✨ Features

- **Dynamic Feed Aggregation & Splitting**: Feeds from Google are grouped by date. The app uses the browser's native `DOMParser` to split each date's content on `<h3>` tags, isolating individual features, fixes, changes, and deprecations into separate cards.
- **Rich & Premium Glassmorphic Theme**: Modern, responsive dark mode styled with deep slate surfaces, custom ambient glow gradients, smooth animations, and tailored color-coded badges for release types.
- **Client-Side Live Filter & Search**: Instantly filter release notes by category (Features, Issues, Changes, Deprecations) and execute search queries across titles, categories, and content bodies.
- **Smart X (Twitter) Share Intent**: Populates a mock preview of your tweet in a compose modal. It automatically formats, tracks character counts (out of 280), checks limits, and handles text truncation dynamically before redirecting to X.

---

## 📂 Project Structure

```
├── static/
│   ├── css/
│   │   └── style.css      # Premium dark glassmorphic styling
│   └── js/
│       └── app.js         # Fetch, parser, search/filter, and tweet modal logic
├── templates/
│   └── index.html         # Application layout and HTML structure
├── app.py                 # Flask server, XML parser, and proxy API
├── .gitignore             # Git ignored files & environments
└── README.md              # Project documentation
```

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12+, Flask, requests
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3
- **External Data**: Official BigQuery XML Feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Python 3 installed on your system.

### 1. Clone the Repository
```bash
git clone https://github.com/zoobacsi/zoobacsi-event-talks-app.git
cd zoobacsi-event-talks-app
```

### 2. Create and Activate Virtual Environment (Optional but Recommended)
On Windows:
```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```
On macOS/Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install flask requests
```

### 4. Run the Application
```bash
python app.py
```

The application will start in debug mode on **`http://127.0.0.1:5000`**. Open this address in your web browser to view the dashboard.

---

## 🔒 Security Notes
The project includes a [.gitignore](.gitignore) file that automatically excludes compile artifacts (`__pycache__/`), virtual environments (`venv/`), logs, and local configuration files. 

When pushing to remote repositories, ensure credentials or personal access tokens are not saved in plain text in your git configs.
