package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// Response envelope structure
type ResponseEnvelope struct {
	Data  interface{} `json:"data"`
	Error *ErrorInfo  `json:"error"`
}

type ErrorInfo struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

type Gateway struct {
	postgrestURL string
	backendAPIURL string
	mcpServiceURL string
	workerServiceURL string
	apiKey       string
	client       *http.Client
}

type LogEntry struct {
	Timestamp   string      `json:"timestamp"`
	Method      string      `json:"method"`
	Path        string      `json:"path"`
	Status      int         `json:"status"`
	RequestID   string      `json:"request_id,omitempty"`
	IP          string      `json:"ip"`
	UserAgent   string      `json:"user_agent,omitempty"`
	RequestSize int64       `json:"request_size,omitempty"`
	ResponseSize int64      `json:"response_size,omitempty"`
	Duration    string      `json:"duration"`
}

func NewGateway() *Gateway {
	postgrestURL := os.Getenv("POSTGREST_URL")
	if postgrestURL == "" {
		postgrestURL = "https://postgrest-server.fly.dev"
	}

	backendAPIURL := os.Getenv("BACKEND_API_URL")
	if backendAPIURL == "" {
		backendAPIURL = "https://backend-api-dfcflow.fly.dev"
	}

	mcpServiceURL := os.Getenv("MCP_SERVICE_URL")
	if mcpServiceURL == "" {
		mcpServiceURL = "https://mcp-service-dfcflow.fly.dev"
	}

	workerServiceURL := os.Getenv("WORKER_SERVICE_URL")
	if workerServiceURL == "" {
		workerServiceURL = "https://worker-service-dfcflow.fly.dev"
	}

	apiKey := os.Getenv("API_KEY")
	if apiKey == "" {
		log.Println("WARNING: API_KEY not set, authentication disabled")
	}

	return &Gateway{
		postgrestURL:  postgrestURL,
		backendAPIURL: backendAPIURL,
		mcpServiceURL: mcpServiceURL,
		workerServiceURL: workerServiceURL,
		apiKey:        apiKey,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Authentication middleware
func (g *Gateway) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if g.apiKey != "" {
			providedKey := r.Header.Get("X-API-Key")
			if providedKey == "" {
				providedKey = r.URL.Query().Get("api_key")
			}

			if providedKey != g.apiKey {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{
					"error": "Unauthorized: Invalid or missing API key",
				})
				return
			}
		}
		next(w, r)
	}
}

// Logging middleware
func (g *Gateway) loggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Read request body
		var requestBody []byte
		if r.Body != nil {
			requestBody, _ = io.ReadAll(r.Body)
			r.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Create response writer wrapper to capture status and size
		ww := &responseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		// Process request
		next(ww, r)

		// Calculate duration
		duration := time.Since(start)

		// Log entry
		logEntry := LogEntry{
			Timestamp:   start.Format(time.RFC3339),
			Method:      r.Method,
			Path:        r.URL.Path,
			Status:      ww.statusCode,
			IP:          getClientIP(r),
			UserAgent:   r.UserAgent(),
			RequestSize: int64(len(requestBody)),
			ResponseSize: ww.size,
			Duration:    duration.String(),
		}

		// Log as JSON
		logJSON, _ := json.Marshal(logEntry)
		log.Println(string(logJSON))
	}
}

// CORS middleware
func (g *Gateway) corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, Prefer")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Range, Content-Encoding, Content-Length")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

// Response envelope helper
func (g *Gateway) sendResponse(w http.ResponseWriter, statusCode int, data interface{}, err *ErrorInfo) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	envelope := ResponseEnvelope{
		Data:  data,
		Error: err,
	}
	
	json.NewEncoder(w).Encode(envelope)
}

// Frontend-facing API handler for /api/gw/v1/*
func (g *Gateway) frontendAPIHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	
	// Remove /api/gw/v1 prefix and route to backend API
	backendPath := strings.TrimPrefix(path, "/api/gw/v1")
	
	// Map frontend paths to backend paths
	switch {
	case strings.HasPrefix(path, "/api/gw/v1/cart/items"):
		if r.Method == "POST" {
			g.handleAddCartItem(w, r)
			return
		} else if r.Method == "PUT" {
			g.handleUpdateCartItem(w, r)
			return
		} else if r.Method == "DELETE" {
			g.handleRemoveCartItem(w, r)
			return
		}
	case strings.HasPrefix(path, "/api/gw/v1/cart") && r.Method == "GET":
		g.handleGetCart(w, r)
		return
	case strings.HasPrefix(path, "/api/gw/v1/cart/checkout") && r.Method == "POST":
		g.handleCheckout(w, r)
		return
	case strings.HasPrefix(path, "/api/gw/v1/deposit-sessions/create-from-cart") && r.Method == "POST":
		g.handleCreateDepositSession(w, r)
		return
	case strings.HasPrefix(path, "/api/gw/v1/deposit-sessions/") && strings.Contains(path, "/checkout") && r.Method == "POST":
		g.handleDepositSessionCheckout(w, r)
		return
	case strings.HasPrefix(path, "/api/gw/v1/deposit-sessions/") && r.Method == "GET":
		g.handleGetDepositSession(w, r)
		return
	case strings.HasPrefix(path, "/api/gw/v1/deposit-plans/default") && r.Method == "GET":
		g.handleGetDefaultDepositPlan(w, r)
		return
	case strings.HasPrefix(path, "/api/gw/v1/deposit-plans/") && r.Method == "GET":
		g.handleGetDepositPlan(w, r)
		return
	case strings.HasPrefix(path, "/api/gw/v1/deposit-plans") && r.Method == "GET":
		g.handleGetDepositPlans(w, r)
		return
	case strings.HasPrefix(path, "/api/gw/v1/orders/") && r.Method == "GET":
		g.handleGetOrderStatus(w, r)
		return
	}
	
	// Default: proxy to backend API at /api/v1
	targetURL := g.backendAPIURL + "/api/v1" + backendPath
	g.proxyToBackend(w, r, targetURL)
}

// Proxy handler with routing
func (g *Gateway) proxyHandler(w http.ResponseWriter, r *http.Request) {
	var targetURL string
	path := r.URL.Path

	// Debug logging
	log.Printf("Gateway received: %s %s", r.Method, path)

	// Route based on path prefix
	switch {
	case strings.HasPrefix(path, "/api/gw/v1/"):
		// Frontend-facing API - handle separately
		log.Printf("Routing to frontend API handler: %s", path)
		g.frontendAPIHandler(w, r)
		return
	case strings.HasPrefix(path, "/rest/"):
		// Route to PostgREST: /rest/* -> PostgREST
		targetURL = g.postgrestURL + strings.TrimPrefix(path, "/rest")
	case strings.HasPrefix(path, "/api/"):
		// Route to Backend API: /api/* -> Backend API (strip /api prefix)
		targetURL = g.backendAPIURL + strings.TrimPrefix(path, "/api")
	case strings.HasPrefix(path, "/mcp/"):
		// Route to MCP Service: /mcp/* -> MCP Service
		// Health endpoint is at /health, other routes keep /mcp prefix
		if path == "/mcp/health" {
			targetURL = g.mcpServiceURL + "/health"
		} else {
			targetURL = g.mcpServiceURL + path
		}
	case strings.HasPrefix(path, "/worker/"):
		// Route to Worker Service: /worker/* -> Worker Service (strip /worker prefix)
		targetURL = g.workerServiceURL + strings.TrimPrefix(path, "/worker")
	default:
		// Default: route to PostgREST (backward compatibility)
		targetURL = g.postgrestURL + path
	}

	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	g.proxyToBackend(w, r, targetURL)
}

// Helper to proxy request to backend API
func (g *Gateway) proxyToBackend(w http.ResponseWriter, r *http.Request, targetURL string) {
	// Create request to target service
	req, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error creating request: %v", err), http.StatusInternalServerError)
		return
	}

	// Copy headers (except Host)
	for key, values := range r.Header {
		if key != "Host" {
			for _, value := range values {
				req.Header.Add(key, value)
			}
		}
	}

	// Forward request
	resp, err := g.client.Do(req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error forwarding request: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers (but skip CORS headers since gateway middleware sets them)
	corsHeaders := map[string]bool{
		"Access-Control-Allow-Origin":      true,
		"Access-Control-Allow-Methods":    true,
		"Access-Control-Allow-Headers":    true,
		"Access-Control-Expose-Headers":   true,
		"Access-Control-Allow-Credentials": true,
		"Access-Control-Max-Age":          true,
	}
	for key, values := range resp.Header {
		// Skip CORS headers - gateway middleware handles these
		if corsHeaders[key] {
			continue
		}
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Set status code
	w.WriteHeader(resp.StatusCode)

	// Copy response body
	io.Copy(w, resp.Body)
}

// Response writer wrapper to capture status and size
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	size       int64
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	size, err := rw.ResponseWriter.Write(b)
	rw.size += int64(size)
	return size, err
}

// Get client IP address
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (for fly.io)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		return forwarded
	}

	// Check X-Real-IP header
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fallback to RemoteAddr
	return r.RemoteAddr
}

// Validate cart item request
func validateCartItemRequest(body map[string]interface{}) *ErrorInfo {
	source, ok := body["source"].(string)
	if !ok || (source != "shopify" && source != "external") {
		return &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "source must be 'shopify' or 'external'",
		}
	}
	
	if source == "external" {
		if _, ok := body["externalId"].(string); !ok {
			return &ErrorInfo{
				Code:    "VALIDATION_ERROR",
				Message: "externalId is required for external items",
			}
		}
	} else {
		if _, ok := body["variantId"].(string); !ok {
			return &ErrorInfo{
				Code:    "VALIDATION_ERROR",
				Message: "variantId is required for shopify items",
			}
		}
	}
	
	return nil
}

// Handle add cart item
func (g *Gateway) handleAddCartItem(w http.ResponseWriter, r *http.Request) {
	log.Printf("handleAddCartItem called")
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Printf("Error decoding body: %v", err)
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "Invalid request body",
		})
		return
	}
	
	if err := validateCartItemRequest(body); err != nil {
		log.Printf("Validation error: %v", err)
		g.sendResponse(w, http.StatusBadRequest, nil, err)
		return
	}
	
	// Forward to backend API
	targetURL := g.backendAPIURL + "/api/v1/cart/items"
	log.Printf("Calling backend API: %s", targetURL)
	bodyBytes, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", targetURL, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := g.client.Do(req)
	if err != nil {
		log.Printf("Backend API error: %v", err)
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	log.Printf("Backend API response status: %d", resp.StatusCode)
	var backendResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		errorCode := "BACKEND_ERROR"
		if code, ok := backendResp["code"].(string); ok {
			errorCode = code
		}
		log.Printf("Backend API error response: %v", backendResp)
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    errorCode,
			Message: fmt.Sprintf("%v", backendResp["message"]),
			Details: backendResp["details"],
		})
		return
	}
	
	// Transform response to envelope format
	cartData := map[string]interface{}{
		"cartId": backendResp["cartId"],
		"cart":   backendResp["cart"],
	}
	g.sendResponse(w, http.StatusOK, cartData, nil)
}

// Handle get cart
func (g *Gateway) handleGetCart(w http.ResponseWriter, r *http.Request) {
	cartId := r.URL.Query().Get("cartId")
	if cartId == "" {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "cartId query parameter is required",
		})
		return
	}
	
	targetURL := g.backendAPIURL + "/api/v1/cart/" + cartId
	req, _ := http.NewRequest("GET", targetURL, nil)
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: fmt.Sprintf("%v", backendResp["message"]),
		})
		return
	}
	
	cartData := map[string]interface{}{
		"cartId": cartId,
		"cart":   backendResp,
	}
	g.sendResponse(w, http.StatusOK, cartData, nil)
}

// Handle update cart item
func (g *Gateway) handleUpdateCartItem(w http.ResponseWriter, r *http.Request) {
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "Invalid request body",
		})
		return
	}
	
	if _, ok := body["cartId"].(string); !ok {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "cartId is required",
		})
		return
	}
	
	if _, ok := body["lineId"].(string); !ok {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "lineId is required",
		})
		return
	}
	
	targetURL := g.backendAPIURL + "/api/v1/cart/items"
	bodyBytes, _ := json.Marshal(body)
	req, _ := http.NewRequest("PUT", targetURL, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: fmt.Sprintf("%v", backendResp["message"]),
		})
		return
	}
	
	cartData := map[string]interface{}{
		"cartId": body["cartId"],
		"cart":   backendResp,
	}
	g.sendResponse(w, http.StatusOK, cartData, nil)
}

// Handle remove cart item
func (g *Gateway) handleRemoveCartItem(w http.ResponseWriter, r *http.Request) {
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "Invalid request body",
		})
		return
	}
	
	if _, ok := body["cartId"].(string); !ok {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "cartId is required",
		})
		return
	}
	
	if _, ok := body["lineId"].(string); !ok {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "lineId is required",
		})
		return
	}
	
	targetURL := g.backendAPIURL + "/api/v1/cart/items"
	bodyBytes, _ := json.Marshal(body)
	req, _ := http.NewRequest("DELETE", targetURL, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: fmt.Sprintf("%v", backendResp["message"]),
		})
		return
	}
	
	cartData := map[string]interface{}{
		"cartId": body["cartId"],
		"cart":   backendResp,
	}
	g.sendResponse(w, http.StatusOK, cartData, nil)
}

// Handle checkout
func (g *Gateway) handleCheckout(w http.ResponseWriter, r *http.Request) {
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "Invalid request body",
		})
		return
	}
	
	if _, ok := body["cartId"].(string); !ok {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "cartId is required",
		})
		return
	}
	
	targetURL := g.backendAPIURL + "/api/v1/cart/checkout"
	bodyBytes, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", targetURL, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: fmt.Sprintf("%v", backendResp["message"]),
		})
		return
	}
	
	g.sendResponse(w, http.StatusOK, backendResp, nil)
}

// Handle create deposit session
func (g *Gateway) handleCreateDepositSession(w http.ResponseWriter, r *http.Request) {
	var body map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "Invalid request body",
		})
		return
	}
	
	if _, ok := body["cartId"].(string); !ok {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "cartId is required",
		})
		return
	}
	
	targetURL := g.backendAPIURL + "/api/v1/deposit-sessions"
	bodyBytes, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", targetURL, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		// Extract error code and message from backend response
		errorCode := "BACKEND_ERROR"
		errorMessage := "An error occurred"
		
		if code, ok := backendResp["code"].(string); ok {
			errorCode = code
		}
		if message, ok := backendResp["message"].(string); ok {
			errorMessage = message
		} else if msg, ok := backendResp["error"].(string); ok {
			errorMessage = msg
		}
		
		log.Printf("Backend API error response: status=%d, code=%s, message=%s", resp.StatusCode, errorCode, errorMessage)
		
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    errorCode,
			Message: errorMessage,
			Details: backendResp["details"],
		})
		return
	}
	
	// Extract session_id safely
	sessionId, ok := backendResp["session_id"].(string)
	if !ok {
		// If session_id is missing, return the full backend response
		log.Printf("Warning: session_id not found in backend response, returning full response")
		g.sendResponse(w, http.StatusOK, backendResp, nil)
		return
	}
	
	responseData := map[string]interface{}{
		"deposit_session_url": "/deposit-session/" + sessionId,
		"session_id":          sessionId,
	}
	
	// Include checkout_url if available (for new multi-order flow)
	if checkoutUrl, ok := backendResp["checkout_url"].(string); ok && checkoutUrl != "" {
		responseData["checkout_url"] = checkoutUrl
	} else if checkoutUrl, ok := backendResp["checkoutUrl"].(string); ok && checkoutUrl != "" {
		// Try camelCase version
		responseData["checkout_url"] = checkoutUrl
	}
	
	// Include draft order IDs and payment amounts if available
	if draftOrderIds, ok := backendResp["draft_order_ids"].([]interface{}); ok {
		responseData["draft_order_ids"] = draftOrderIds
	} else if draftOrderIds, ok := backendResp["draftOrderIds"].([]interface{}); ok {
		// Try camelCase version
		responseData["draft_order_ids"] = draftOrderIds
	}
	
	if firstDraftOrderId, ok := backendResp["first_draft_order_id"].(string); ok {
		responseData["first_draft_order_id"] = firstDraftOrderId
	} else if firstDraftOrderId, ok := backendResp["firstDraftOrderId"].(string); ok {
		responseData["first_draft_order_id"] = firstDraftOrderId
	}
	
	if paymentAmounts, ok := backendResp["payment_amounts"].([]interface{}); ok {
		responseData["payment_amounts"] = paymentAmounts
	} else if paymentAmounts, ok := backendResp["paymentAmounts"].([]interface{}); ok {
		responseData["payment_amounts"] = paymentAmounts
	}
	
	log.Printf("Deposit session created: sessionId=%s, hasCheckoutUrl=%v", sessionId, responseData["checkout_url"] != nil)
	g.sendResponse(w, http.StatusOK, responseData, nil)
}

// Handle get deposit session
func (g *Gateway) handleGetDepositSession(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "sessionId is required",
		})
		return
	}
	
	sessionId := pathParts[3]
	targetURL := g.backendAPIURL + "/api/v1/deposit-sessions/" + sessionId
	req, _ := http.NewRequest("GET", targetURL, nil)
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: fmt.Sprintf("%v", backendResp["message"]),
		})
		return
	}
	
	responseData := map[string]interface{}{
		"session": backendResp,
	}
	g.sendResponse(w, http.StatusOK, responseData, nil)
}

// Handle deposit session checkout
func (g *Gateway) handleDepositSessionCheckout(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "sessionId is required",
		})
		return
	}
	
	sessionId := pathParts[3]
	targetURL := g.backendAPIURL + "/api/v1/deposit-sessions/" + sessionId + "/checkout"
	req, _ := http.NewRequest("POST", targetURL, nil)
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: fmt.Sprintf("%v", backendResp["message"]),
		})
		return
	}
	
	g.sendResponse(w, http.StatusOK, backendResp, nil)
}

// Handle get order status
func (g *Gateway) handleGetOrderStatus(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "orderId is required",
		})
		return
	}
	
	orderId := pathParts[3]
	targetURL := g.backendAPIURL + "/api/v1/orders/" + orderId
	req, _ := http.NewRequest("GET", targetURL, nil)
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: fmt.Sprintf("%v", backendResp["message"]),
		})
		return
	}
	
	g.sendResponse(w, http.StatusOK, backendResp, nil)
}

// Handle get deposit plans
func (g *Gateway) handleGetDepositPlans(w http.ResponseWriter, r *http.Request) {
	targetURL := g.backendAPIURL + "/api/v1/deposit-plans"
	req, _ := http.NewRequest("GET", targetURL, nil)
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		errorResp, _ := backendResp.(map[string]interface{})
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: fmt.Sprintf("%v", errorResp["message"]),
		})
		return
	}
	
	g.sendResponse(w, http.StatusOK, backendResp, nil)
}

// Handle get default deposit plan
func (g *Gateway) handleGetDefaultDepositPlan(w http.ResponseWriter, r *http.Request) {
	targetURL := g.backendAPIURL + "/api/v1/deposit-plans/default"
	req, _ := http.NewRequest("GET", targetURL, nil)
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		errorResp, _ := backendResp.(map[string]interface{})
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: fmt.Sprintf("%v", errorResp["message"]),
		})
		return
	}
	
	g.sendResponse(w, http.StatusOK, backendResp, nil)
}

// Handle get specific deposit plan
func (g *Gateway) handleGetDepositPlan(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		g.sendResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
			Code:    "VALIDATION_ERROR",
			Message: "planId is required",
		})
		return
	}
	
	planId := pathParts[3]
	targetURL := g.backendAPIURL + "/api/v1/deposit-plans/" + planId
	req, _ := http.NewRequest("GET", targetURL, nil)
	
	resp, err := g.client.Do(req)
	if err != nil {
		g.sendResponse(w, http.StatusBadGateway, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: "Failed to connect to backend API",
		})
		return
	}
	defer resp.Body.Close()
	
	var backendResp interface{}
	json.NewDecoder(resp.Body).Decode(&backendResp)
	
	if resp.StatusCode >= 400 {
		errorResp, _ := backendResp.(map[string]interface{})
		g.sendResponse(w, resp.StatusCode, nil, &ErrorInfo{
			Code:    "BACKEND_ERROR",
			Message: fmt.Sprintf("%v", errorResp["message"]),
		})
		return
	}
	
	g.sendResponse(w, http.StatusOK, backendResp, nil)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	gateway := NewGateway()

	// Setup routes with middleware chain
	handler := gateway.corsMiddleware(
		gateway.loggingMiddleware(
			gateway.authMiddleware(
				gateway.proxyHandler,
			),
		),
	)

	http.HandleFunc("/", handler)

	log.Printf("API Gateway starting on port %s", port)
	log.Printf("PostgREST backend: %s", gateway.postgrestURL)
	log.Printf("Backend API: %s", gateway.backendAPIURL)
	log.Printf("MCP Service: %s", gateway.mcpServiceURL)
	log.Printf("Worker Service: %s", gateway.workerServiceURL)
	log.Println("Routing:")
	log.Println("  /api/gw/v1/* -> Frontend API (Gateway)")
	log.Println("  /rest/*       -> PostgREST")
	log.Println("  /api/*        -> Backend API")
	log.Println("  /mcp/*        -> MCP Service")
	log.Println("  /worker/*     -> Worker Service")
	if gateway.apiKey != "" {
		log.Println("Authentication: Enabled (API Key)")
	} else {
		log.Println("Authentication: Disabled")
	}

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

