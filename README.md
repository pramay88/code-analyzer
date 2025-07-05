# Code Analyzer API

An intelligent API to analyze the **time and space complexity** of code snippets.  
Powered by AI and static analysis, it detects common patterns like loops, recursion, and memory usage.

> Live Endpoint: [https://code-analyzer-six.vercel.app/api/analyze](https://code-analyzer-six.vercel.app/api/analyze)
## 📥 API Usage

### Live Endpoint

```http
POST https://code-analyzer-six.vercel.app/api/analyze
```

---
![image](https://github.com/user-attachments/assets/e314bab9-86d3-435a-9bb7-541d37502a30)

---
## 🚀 Features

- ✅ Returns AI-generated complexity analysis
- 🔄 Supports recursive, iterative, and hybrid logic
- 🧠 Uses LLMs + local rules for fallback
- 📦 Easy to integrate in Chrome Extensions, web apps, and CLI tools

---



## 🛠️ Fallback & Architecture

The API uses a **tiered fallback system** to ensure reliable complexity estimation:

- 🎯 **Primary:** Google Gemini AI (for deep analysis)
- 🧠 **Fallback:** Openrouter.ai (optional)
- ⚙️ **Final Fallback:** Local static analyzer (AST + rule-based)

This layered architecture ensures results are returned even if LLM quotas are exceeded or APIs are unavailable.

## 🧪 Testing the API

You can test the API using **Postman** or **`curl`**:

```bash
curl -X POST https://code-analyzer-six.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"code":"function fib(n) { if(n <= 1) return n; return fib(n - 1) + fib(n - 2); }"}'
