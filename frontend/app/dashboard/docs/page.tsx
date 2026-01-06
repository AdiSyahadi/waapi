'use client';

import { useState } from 'react';
import { Code, BookOpen, Zap, Copy, Check, Key, Send, Users, MessageSquare, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState('quick-start');
  const [activeLanguage, setActiveLanguage] = useState('php');
  const [copiedCode, setCopiedCode] = useState('');

  const copyCode = (code: string, id: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = code;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopiedCode(id);
      toast.success('Code copied!');
      setTimeout(() => setCopiedCode(''), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const sections = [
    { id: 'quick-start', label: 'Quick Start', icon: Zap },
    { id: 'authentication', label: 'Authentication', icon: Key },
    { id: 'endpoints', label: 'API Endpoints', icon: Code },
    { id: 'examples', label: 'Code Examples', icon: MessageSquare },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
        <p className="text-gray-600 mt-1">Complete guide to integrate WhatsApp API</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-2 sticky top-6">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition ${
                  activeSection === section.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <section.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Start */}
          {activeSection === 'quick-start' && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start Guide</h2>
                <p className="text-gray-700 mb-6">
                  Get started with WhatsApp API in minutes. Follow these simple steps to integrate with your CRM.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Create API Key</h3>
                      <p className="text-gray-700 mb-3">
                        Go to <strong>API Keys</strong> menu and create a new key for your application.
                      </p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <code className="text-sm text-gray-800">wapi_1a2b3c4d5e6f7g8h9i0j...</code>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Create WhatsApp Session</h3>
                      <p className="text-gray-700 mb-3">
                        Create a session via dashboard or API, then scan QR code with WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Send Your First Message</h3>
                      <p className="text-gray-700 mb-3">
                        Use the API to send messages from your CRM system:
                      </p>
                      <div className="bg-gray-900 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyCode(`curl -X POST http://72.62.125.132:3000/api/v1/messages/send/text \\
  -H "X-API-Key: wapi_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "your-session-id",
    "phone": "6281234567890",
    "message": "Hello from CRM!"
  }'`, 'first-message')}
                          className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition"
                        >
                          {copiedCode === 'first-message' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <pre className="text-sm text-green-400 overflow-x-auto pr-12">
{`curl -X POST http://72.62.125.132:3000/api/v1/messages/send/text \\
  -H "X-API-Key: wapi_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "your-session-id",
    "phone": "6281234567890",
    "message": "Hello from CRM!"
  }'`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">📌 Base URL</h4>
                <p className="text-sm text-blue-800"><code>http://72.62.125.132:3000/api/v1</code></p>
              </div>
            </>
          )}

          {/* Authentication */}
          {activeSection === 'authentication' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication</h2>
              <p className="text-gray-700 mb-6">
                All API requests must be authenticated using an API key in the <code className="bg-gray-100 px-2 py-1 rounded text-sm">X-API-Key</code> header.
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Header Format</h3>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <button
                      onClick={() => copyCode('X-API-Key: wapi_your_api_key_here', 'header')}
                      className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition text-sm"
                    >
                      {copiedCode === 'header' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <pre className="text-sm text-green-400">X-API-Key: wapi_your_api_key_here</pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Example Request</h3>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <button
                      onClick={() => copyCode(`curl -X GET http://72.62.125.132:3000/api/v1/sessions \\
  -H "X-API-Key: wapi_your_api_key_here"`, 'auth-example')}
                      className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition text-sm"
                    >
                      {copiedCode === 'auth-example' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <pre className="text-sm text-green-400 overflow-x-auto pr-12">
{`curl -X GET http://72.62.125.132:3000/api/v1/sessions \\
  -H "X-API-Key: wapi_your_api_key_here"`}
                    </pre>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Security Best Practices</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Never commit API keys to version control</li>
                    <li>• Store keys in environment variables</li>
                    <li>• Rotate keys regularly</li>
                    <li>• Use separate keys for dev/prod</li>
                    <li>• Monitor API usage for suspicious activity</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* API Endpoints */}
          {activeSection === 'endpoints' && (
            <div className="space-y-6">
              {/* Send Text Message */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">POST</span>
                  <code className="text-sm font-mono text-gray-800">/messages/send/text</code>
                </div>
                <p className="text-gray-700 mb-3">Send a text message</p>
                <h4 className="font-semibold text-gray-900 text-sm mb-2">Request Body:</h4>
                <div className="bg-gray-900 rounded-lg p-4 relative">
                  <button
                    onClick={() => copyCode(`{
  "sessionId": "your-session-id",
  "phone": "6281234567890",
  "message": "Hello from CRM!"
}`, 'endpoint-text')}
                    className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition text-sm"
                  >
                    {copiedCode === 'endpoint-text' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <pre className="text-sm text-green-400 overflow-x-auto pr-12">
{`{
  "sessionId": "your-session-id",
  "phone": "6281234567890",
  "message": "Hello from CRM!"
}`}
                  </pre>
                </div>
              </div>

              {/* Send Media */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">POST</span>
                  <code className="text-sm font-mono text-gray-800">/messages/send/media-url</code>
                </div>
                <p className="text-gray-700 mb-3">Send media (image/video/document) by URL</p>
                <h4 className="font-semibold text-gray-900 text-sm mb-2">Request Body:</h4>
                <div className="bg-gray-900 rounded-lg p-4 relative">
                  <button
                    onClick={() => copyCode(`{
  "sessionId": "your-session-id",
  "phone": "6281234567890",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Check this out!",
  "mediaType": "image"
}`, 'endpoint-media')}
                    className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition text-sm"
                  >
                    {copiedCode === 'endpoint-media' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <pre className="text-sm text-green-400 overflow-x-auto pr-12">
{`{
  "sessionId": "your-session-id",
  "phone": "6281234567890",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Check this out!",
  "mediaType": "image"
}`}
                  </pre>
                </div>
              </div>

              {/* Get Sessions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">GET</span>
                  <code className="text-sm font-mono text-gray-800">/sessions</code>
                </div>
                <p className="text-gray-700 mb-3">Get all WhatsApp sessions</p>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-sm text-green-400">
{`curl -X GET http://72.62.125.132:3000/api/v1/sessions \\
  -H "X-API-Key: wapi_your_api_key"`}
                  </pre>
                </div>
              </div>

              {/* Check Number */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">POST</span>
                  <code className="text-sm font-mono text-gray-800">/contacts/check</code>
                </div>
                <p className="text-gray-700 mb-3">Check if numbers are registered on WhatsApp</p>
                <div className="bg-gray-900 rounded-lg p-4 relative">
                  <button
                    onClick={() => copyCode(`{
  "sessionId": "your-session-id",
  "phones": ["6281234567890", "6289876543210"]
}`, 'endpoint-check')}
                    className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition text-sm"
                  >
                    {copiedCode === 'endpoint-check' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <pre className="text-sm text-green-400 overflow-x-auto pr-12">
{`{
  "sessionId": "your-session-id",
  "phones": ["6281234567890", "6289876543210"]
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Code Examples */}
          {activeSection === 'examples' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Code Examples</h2>
                <p className="text-gray-600 mb-6">Ready-to-use code snippets for popular programming languages</p>

                {/* Language Tabs */}
                <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
                  {[
                    { id: 'php', name: 'PHP' },
                    { id: 'python', name: 'Python' },
                    { id: 'javascript', name: 'JavaScript' },
                    { id: 'csharp', name: 'C#' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setActiveLanguage(lang.id)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${
                        activeLanguage === lang.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>

                {/* PHP */}
                {activeLanguage === 'php' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">PHP - Send Message</h3>
                    <div className="bg-gray-900 rounded-lg p-4 relative">
                      <button
                        onClick={() => copyCode(`<?php
class WhatsAppAPI {
    private $apiKey = 'wapi_your_api_key_here';
    private $baseUrl = 'http://72.62.125.132:3000/api/v1';
    
    public function sendMessage($sessionId, $phone, $message) {
        $url = $this->baseUrl . '/messages/send/text';
        
        $data = [
            'sessionId' => $sessionId,
            'phone' => $phone,
            'message' => $message
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey
        ]);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}

// Usage
$wa = new WhatsAppAPI();
$result = $wa->sendMessage(
    'your-session-id',
    '6281234567890',
    'Hello from CRM!'
);
?>`, 'php-example')}
                        className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition text-sm"
                      >
                        {copiedCode === 'php-example' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <pre className="text-sm text-green-400 overflow-x-auto pr-12">
{`<?php
class WhatsAppAPI {
    private $apiKey = 'wapi_your_api_key_here';
    private $baseUrl = 'http://72.62.125.132:3000/api/v1';
    
    public function sendMessage($sessionId, $phone, $message) {
        $url = $this->baseUrl . '/messages/send/text';
        
        $data = [
            'sessionId' => $sessionId,
            'phone' => $phone,
            'message' => $message
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey
        ]);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}

// Usage
$wa = new WhatsAppAPI();
$result = $wa->sendMessage(
    'your-session-id',
    '6281234567890',
    'Hello from CRM!'
);
?>`}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Python */}
                {activeLanguage === 'python' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Python - Send Message</h3>
                    <div className="bg-gray-900 rounded-lg p-4 relative">
                      <button
                        onClick={() => copyCode(`import requests

class WhatsAppAPI:
    def __init__(self):
        self.api_key = 'wapi_your_api_key_here'
        self.base_url = 'http://72.62.125.132:3000/api/v1'
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        }
    
    def send_message(self, session_id, phone, message):
        url = f'{self.base_url}/messages/send/text'
        
        payload = {
            'sessionId': session_id,
            'phone': phone,
            'message': message
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()

# Usage
wa = WhatsAppAPI()
result = wa.send_message(
    'your-session-id',
    '6281234567890',
    'Hello from CRM!'
)
print(result)`, 'python-example')}
                        className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition text-sm"
                      >
                        {copiedCode === 'python-example' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <pre className="text-sm text-green-400 overflow-x-auto pr-12">
{`import requests

class WhatsAppAPI:
    def __init__(self):
        self.api_key = 'wapi_your_api_key_here'
        self.base_url = 'http://72.62.125.132:3000/api/v1'
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        }
    
    def send_message(self, session_id, phone, message):
        url = f'{self.base_url}/messages/send/text'
        
        payload = {
            'sessionId': session_id,
            'phone': phone,
            'message': message
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()

# Usage
wa = WhatsAppAPI()
result = wa.send_message(
    'your-session-id',
    '6281234567890',
    'Hello from CRM!'
)
print(result)`}
                      </pre>
                    </div>
                  </div>
                )}

                {/* JavaScript */}
                {activeLanguage === 'javascript' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">JavaScript/Node.js - Send Message</h3>
                    <div className="bg-gray-900 rounded-lg p-4 relative">
                      <button
                        onClick={() => copyCode(`const axios = require('axios');

class WhatsAppAPI {
  constructor() {
    this.apiKey = 'wapi_your_api_key_here';
    this.baseUrl = 'http://72.62.125.132:3000/api/v1';
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };
  }

  async sendMessage(sessionId, phone, message) {
    const response = await axios.post(
      \`\${this.baseUrl}/messages/send/text\`,
      { sessionId, phone, message },
      { headers: this.headers }
    );
    return response.data;
  }
}

// Usage
const wa = new WhatsAppAPI();
const result = await wa.sendMessage(
  'your-session-id',
  '6281234567890',
  'Hello from CRM!'
);
console.log(result);`, 'js-example')}
                        className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition text-sm"
                      >
                        {copiedCode === 'js-example' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <pre className="text-sm text-green-400 overflow-x-auto pr-12">
{`const axios = require('axios');

class WhatsAppAPI {
  constructor() {
    this.apiKey = 'wapi_your_api_key_here';
    this.baseUrl = 'http://72.62.125.132:3000/api/v1';
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };
  }

  async sendMessage(sessionId, phone, message) {
    const response = await axios.post(
      \`\${this.baseUrl}/messages/send/text\`,
      { sessionId, phone, message },
      { headers: this.headers }
    );
    return response.data;
  }
}

// Usage
const wa = new WhatsAppAPI();
const result = await wa.sendMessage(
  'your-session-id',
  '6281234567890',
  'Hello from CRM!'
);
console.log(result);`}
                      </pre>
                    </div>
                  </div>
                )}

                {/* C# */}
                {activeLanguage === 'csharp' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">C# - Send Message</h3>
                    <div className="bg-gray-900 rounded-lg p-4 relative">
                      <button
                        onClick={() => copyCode(`using System.Net.Http;
using System.Text;
using Newtonsoft.Json;

public class WhatsAppAPI
{
    private readonly string _apiKey = "wapi_your_api_key_here";
    private readonly string _baseUrl = "http://72.62.125.132:3000/api/v1";
    private readonly HttpClient _httpClient;

    public WhatsAppAPI()
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("X-API-Key", _apiKey);
    }

    public async Task<string> SendMessage(string sessionId, string phone, string message)
    {
        var url = $"{_baseUrl}/messages/send/text";
        
        var payload = new {
            sessionId = sessionId,
            phone = phone,
            message = message
        };
        
        var json = JsonConvert.SerializeObject(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await _httpClient.PostAsync(url, content);
        return await response.Content.ReadAsStringAsync();
    }
}

// Usage
var wa = new WhatsAppAPI();
var result = await wa.SendMessage(
    "your-session-id",
    "6281234567890",
    "Hello from CRM!"
);`, 'csharp-example')}
                        className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition text-sm"
                      >
                        {copiedCode === 'csharp-example' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <pre className="text-sm text-green-400 overflow-x-auto pr-12">
{`using System.Net.Http;
using System.Text;
using Newtonsoft.Json;

public class WhatsAppAPI
{
    private readonly string _apiKey = "wapi_your_api_key_here";
    private readonly string _baseUrl = "http://72.62.125.132:3000/api/v1";
    private readonly HttpClient _httpClient;

    public WhatsAppAPI()
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("X-API-Key", _apiKey);
    }

    public async Task<string> SendMessage(string sessionId, string phone, string message)
    {
        var url = $"{_baseUrl}/messages/send/text";
        
        var payload = new {
            sessionId = sessionId,
            phone = phone,
            message = message
        };
        
        var json = JsonConvert.SerializeObject(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await _httpClient.PostAsync(url, content);
        return await response.Content.ReadAsStringAsync();
    }
}

// Usage
var wa = new WhatsAppAPI();
var result = await wa.SendMessage(
    "your-session-id",
    "6281234567890",
    "Hello from CRM!"
);`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <a
          href="/dashboard/api-keys"
          className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition border border-gray-200"
        >
          <Key className="h-6 w-6 text-primary-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-1">Manage API Keys</h3>
          <p className="text-sm text-gray-600">Create and manage your API keys</p>
        </a>
        
        <a
          href="/dashboard/sessions"
          className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition border border-gray-200"
        >
          <Users className="h-6 w-6 text-primary-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-1">WhatsApp Sessions</h3>
          <p className="text-sm text-gray-600">Connect your WhatsApp accounts</p>
        </a>
        
        <a
          href="http://72.62.125.132:3000/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition border border-gray-200"
        >
          <ExternalLink className="h-6 w-6 text-primary-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-1">Full API Reference</h3>
          <p className="text-sm text-gray-600">View complete Swagger documentation</p>
        </a>
      </div>
    </div>
  );
}
