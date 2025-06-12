#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url'); // Ensure URL is imported for the URL constructor

const download = (url, dest, cb) => {
    const file = fs.createWriteStream(dest);

    // Define request options, including a User-Agent header
    const requestOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' // A common browser User-Agent
        }
    };

    https.get(url, requestOptions, (response) => {
        console.log(`[DOWNLOAD-FINAL-DEBUG] Attempting GET for URL: ${url}`);
        console.log(`[DOWNLOAD-FINAL-DEBUG] Initial Status Code: ${response.statusCode}`);
        if (response.headers.location) {
            console.log(`[DOWNLOAD-FINAL-DEBUG] Initial Location header: ${response.headers.location}`);
        }

        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const newUrl = new URL(response.headers.location, url).href;
            console.log(`[DOWNLOAD-FINAL-DEBUG] Redirect detected. Following to: ${newUrl}`);
            response.destroy(); // Stop current response
            file.close(); // Close file to prevent partial writes
            fs.unlink(dest, () => { // Delete incomplete file
                download(newUrl, dest, cb); // Recurse with new URL
            });
            return;
        }

        // Handle non-200 OK responses (e.g., 404 Not Found)
        if (response.statusCode !== 200) {
            console.error(`[DOWNLOAD-FINAL-ERROR] Received unexpected status code ${response.statusCode} for URL: ${url}`);
            // Still pipe the error response body to the file for inspection, but also error out.
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => cb(`Failed to download ${url}: Status ${response.statusCode}`));
            });
            return;
        }

        // If it's a 200 OK, proceed to pipe the actual file content
        response.pipe(file);
        file.on('finish', () => {
            console.log(`[DOWNLOAD-FINAL-DEBUG] Successfully finished piping content for: ${url} (Status: ${response.statusCode})`);
            file.close(cb);
        });
    }).on('error', (err) => {
        console.error(`[DOWNLOAD-FINAL-ERROR] Network error during GET for ${url}:`, err.message);
        fs.unlink(dest, () => cb(err.message)); // Delete file on network error
    });
};

const downloadAndMove = (baseUrl, fileName, targetDir, cb) => {
    const tempPath = path.join('/tmp', fileName);
    const finalPath = path.join(targetDir, fileName);

    download(`${baseUrl}/${fileName}`, tempPath, (err) => {
        if (err) {
            console.error(`Error downloading ${fileName}:`, err);
            return cb(err);
        }
        try {
            fs.copyFileSync(tempPath, finalPath);
            console.log(`Successfully copied: ${finalPath}`);
            fs.unlinkSync(tempPath);
            console.log(`Removed temporary file: ${tempPath}`);
            cb(null);
        } catch (copyErr) {
            console.error(`Error copying or deleting ${fileName}:`, copyErr);
            cb(copyErr);
        }
    });
};

const run = async () => {
    const targetDir = path.join(__dirname, '..', 'demo', 'web', 'js');
    const reactBaseUrl = 'https://unpkg.com/react@16/umd';
    const reactDomBaseUrl = 'https://unpkg.com/react-dom@16/umd'; // Correct base URL for react-dom

    console.log(`Ensuring target directory exists: ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });

    const appJsContent = `
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      refreshing: false,
      requests: []
    };
    this.eventSource = null;
  }

  componentDidMount() {
    this.fetchRequests();
  }

  toggleRefresh = () => {
    this.setState(prevState => {
      const newRefreshing = !prevState.refreshing;
      if (newRefreshing) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
      return { refreshing: newRefreshing };
    });
  };

  startAutoRefresh = () => {
    if (!this.eventSource) {
      this.refreshInterval = setInterval(this.fetchRequests, 3000);
      console.log("Auto-refresh started.");
    }
  };

  stopAutoRefresh = () => {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log("Auto-refresh stopped.");
    }
  };

  fetchRequests = async () => {
    try {
      // CORRECTED URL HERE!
      const response = await fetch('https://cautious-space-robot-69pr5jqpq679fx4qr-4566.app.github.dev/restapis/deno0wvff7/local/requests');
      const data = await response.json();
      this.setState({ requests: data.requests.sort((a, b) => b.timestamp - a.timestamp) });
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  createRequest = async () => {
    try {
      // CORRECTED URL HERE!
      const response = await fetch('https://cautious-space-robot-69pr5jqpq679fx4qr-4566.app.github.dev/restapis/deno0wvff7/local/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const newRequest = await response.json();
      console.log("New request created:", newRequest);
      this.fetchRequests();
    } catch (error) {
      console.error("Error creating request:", error);
    }
  };

  render() {
    return (
      <div>
        <h1>Request Processing Demo</h1>
        <div className="controls">
          <label>
            <input type="checkbox" checked={this.state.refreshing} onChange={this.toggleRefresh} /> Auto-Refresh
          </label>
          <button onClick={this.createRequest}>Create new request</button>
        </div>
        <div className="request-list">
          {this.state.requests.length === 0 ? (
            <p>No requests found. Click "Create new request" to start.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Finished</th>
                </tr>
              </thead>
              <tbody>
                {this.state.requests.map(req => (
                  <tr key={req.requestID}>
                    <td>{req.requestID.substring(0, 8)}...</td>
                    <td>{req.status}</td>
                    <td>{new Date(req.timestamp).toLocaleTimeString()}</td>
                    <td>{req.finishTime ? new Date(req.finishTime).toLocaleTimeString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
`;
    fs.writeFileSync(path.join(targetDir, 'app.js'), appJsContent);
    console.log(`Created basic app.js in ${path.join(targetDir, 'app.js')}`);

    // Download React.development.js
    await new Promise((resolve, reject) => {
        downloadAndMove(reactBaseUrl, 'react.development.js', targetDir, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });

    // Download React-DOM.development.js
    await new Promise((resolve, reject) => {
        downloadAndMove(reactDomBaseUrl, 'react-dom.development.js', targetDir, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
};

run(); // Call the async function
