import { html } from "hono/html"

export const HomePage = html`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NewsNext Proxy Status</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .status-pending { background-color: #f3f4f6; color: #374151; }
    .status-success { background-color: #d1fae5; color: #065f46; }
    .status-error { background-color: #fee2e2; color: #991b1b; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen p-8">
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Source Status</h1>
      <button onclick="checkAll()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
        Refresh All
      </button>
    </div>

    <div id="grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <!-- Cards will be injected here -->
    </div>
  </div>

  <script>
    async function fetchSources() {
      try {
        const response = await fetch('/sources');
        const json = await response.json();
        return json.data;
      } catch (error) {
        console.error('Failed to fetch sources:', error);
        return [];
      }
    }

    function createCard(source) {
      const sourceId = \`\${source.namespace}:\${source.id}\`;
      const div = document.createElement('div');
      div.className = 'bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200 hover:shadow-md';
      div.id = \`card-\${sourceId.replace(':', '-')}\`;

      div.innerHTML = \`
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-bold text-lg text-gray-900">\${source.name}</h3>
            <p class="text-sm text-gray-500">\${source.title || source.id}</p>
          </div>
          <span id="status-\${sourceId.replace(':', '-')}" class="status-badge status-pending">
            Pending
          </span>
        </div>

        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Namespace</span>
            <span class="font-medium font-mono text-gray-700">\${source.namespace}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">ID</span>
            <span class="font-medium font-mono text-gray-700">\${source.id}</span>
          </div>
          <div class="flex justify-between items-center pt-2 border-t border-gray-50 mt-2">
            <span class="text-gray-500">Latency</span>
            <span id="latency-\${sourceId.replace(':', '-')}" class="font-mono text-gray-400">-</span>
          </div>
        </div>

        <div id="error-\${sourceId.replace(':', '-')}" class="hidden mt-3 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 break-all"></div>
      \`;

      return div;
    }

    async function checkSource(source) {
      const sourceId = \`\${source.namespace}:\${source.id}\`;
      const cardId = sourceId.replace(':', '-');
      const statusEl = document.getElementById(\`status-\${cardId}\`);
      const latencyEl = document.getElementById(\`latency-\${cardId}\`);
      const errorEl = document.getElementById(\`error-\${cardId}\`);
      const cardEl = document.getElementById(\`card-\${cardId}\`);

      statusEl.className = 'status-badge status-pending';
      statusEl.textContent = 'Checking...';
      statusEl.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Checking';
      errorEl.classList.add('hidden');
      latencyEl.textContent = '-';

      const start = performance.now();

      try {
        const res = await fetch(\`/sources/\${sourceId}\`);
        const data = await res.json();
        const duration = Math.round(performance.now() - start);

        latencyEl.textContent = \`\${duration}ms\`;

        if (data.success) {
          statusEl.className = 'status-badge status-success';
          statusEl.textContent = 'Operational';
          latencyEl.className = 'font-mono text-green-600 font-medium';
        } else {
          throw new Error(data.error?.message || 'Unknown error');
        }
      } catch (err) {
        const duration = Math.round(performance.now() - start);
        latencyEl.textContent = \`\${duration}ms\`;
        latencyEl.className = 'font-mono text-red-500';

        statusEl.className = 'status-badge status-error';
        statusEl.textContent = 'Failed';

        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    }

    async function checkAll() {
      const grid = document.getElementById('grid');
      grid.innerHTML = ''; // Clear existing

      const sources = await fetchSources();

      // Render all cards first
      sources.forEach(source => {
        grid.appendChild(createCard(source));
      });

      // Check in parallel with a concurrency limit if needed,
      // but for simplicity and browser limit handling, we'll just fire them.
      // Browsers usually limit concurrent connections (e.g. 6), so it handles itself somewhat.
      // However, to be nicer to the UI rendering, we can batch or just loop.

      for (const source of sources) {
        checkSource(source);
      }
    }

    // Start on load
    checkAll();
  </script>
</body>
</html>
`
