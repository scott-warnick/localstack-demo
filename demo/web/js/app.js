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
      // THIS IS THE CORRECTED URL
      const response = await fetch('https://cautious-space-robot-69pr5jqpq679fx4qr-4566.app.github.dev/restapis/deno0wvff7/local/requests');
      const data = await response.json();
      this.setState({ requests: data.requests.sort((a, b) => b.timestamp - a.timestamp) });
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  createRequest = async () => {
    try {
      // THIS IS THE CORRECTED URL
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

// Make sure this line is complete and not truncated!
ReactDOM.render(<App />, document.getElementById('app'));
