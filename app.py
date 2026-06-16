import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, send_from_directory
import os

app = Flask(__name__, static_folder='static', template_folder='templates')

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        # Fetch the feed with a standard User-Agent header
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        xml_content = response.content
        root = ET.fromstring(xml_content)
        
        # Atom Namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        feed_title = root.find('atom:title', ns)
        feed_title_text = feed_title.text if feed_title is not None else "BigQuery Release Notes"
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            title_text = title.text if title is not None else ''
            
            updated = entry.find('atom:updated', ns)
            updated_text = updated.text if updated is not None else ''
            
            entry_id = entry.find('atom:id', ns)
            entry_id_text = entry_id.text if entry_id is not None else ''
            
            # Find alternate link
            link_url = ''
            for link in entry.findall('atom:link', ns):
                rel = link.attrib.get('rel')
                if rel == 'alternate' or not rel:
                    link_url = link.attrib.get('href', '')
                    break
            
            # Find content or summary
            content_text = ''
            content = entry.find('atom:content', ns)
            if content is not None:
                content_text = content.text
            else:
                summary = entry.find('atom:summary', ns)
                content_text = summary.text if summary is not None else ''
                
            entries.append({
                'id': entry_id_text,
                'title': title_text, # Date
                'updated': updated_text,
                'link': link_url,
                'content': content_text
            })
            
        return {
            'success': True,
            'feed_title': feed_title_text,
            'entries': entries
        }
        
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return {
            'success': False,
            'error': str(e),
            'feed_title': "BigQuery Release Notes",
            'entries': []
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    data = fetch_and_parse_feed()
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
