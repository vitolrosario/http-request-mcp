import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

(async () => {
    const server = new McpServer({
        name: "http-mcp",
        version: "0.0.1"
    });

    server.tool(
        'http-request',
        'A tool for making HTTP requests',
        {
            url: z.string().url().describe('The URL to make the request to'),
            method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('The HTTP method to use'),
            headers: z.record(z.string()).optional().describe('The headers to include in the request'),
            body: z.string().optional().describe('The body of the request')
        },
        async ({ url, method, headers, body }) => {
            try {
                const response = await fetch(url, {
                    method,
                    headers: headers || { 'Content-Type': 'application/json' },
                    body: body ? JSON.stringify(JSON.parse(body)) : undefined
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
                }

                const responseContentType = response.headers.get('Content-Type');

                if (responseContentType?.includes('application/json')) {
                    const data = await response.json();
                    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
                } 
                else if (responseContentType?.includes('application/octet-stream')) {
                    const buffer = await response.arrayBuffer();
                    const text = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                    return { content: [{ type: 'text', text }] };
                } 
                else {
                    const text = await response.text();
                    return { content: [{ type: 'text', text }] };
                }
            } catch (error) {
                return error
            }
        }
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
})();
