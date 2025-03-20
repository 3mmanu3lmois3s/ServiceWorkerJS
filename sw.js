// sw.js
/*jshint esversion: 6 */
/*jshint worker: true */
const basePath = '/ServiceWorkerJS/';
let nextCustomerId = 1;
let nextQuoteId = 1;
let nextPolicyId = 1;
let nextClaimId = 1;

// In-memory data storage (for demo purposes)
const db = {
    customers: {},
    products: [
        { productId: 'home-insurance', name: 'Home Insurance', description: 'Covers your home and belongings.' },
        { productId: 'auto-insurance', name: 'Auto Insurance', description: 'Covers your vehicle.' },
        { productId: 'life-insurance', name: 'Life Insurance', description: 'Provides financial protection for your loved ones.' }
    ],
    quotes: {},
    policies: {},
    claims: {}
};

self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating.');
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);
    console.log('Service Worker: Fetch event for', requestUrl.href);

    if (requestUrl.pathname.startsWith(basePath)) {
        const relativePath = requestUrl.pathname.substring(basePath.length);
        console.log('Service Worker: relativePath is:', relativePath);
        const method = event.request.method;
        console.log('Service Worker: method is:', method);

        const [route, customerId, quotesOrPolicies, quoteOrPolicyId, action] = relativePath.split('/').filter(part => part !== '');

        try {
            // Top-level routes and nested routes
            if (relativePath === 'products' && method === 'GET') {
                event.respondWith(handleGetProducts());
            } else if (route === 'customers') {

                if (!customerId && method === 'POST') { // Create Customer: /customers
                    console.log("Entra en customers post");
                    event.respondWith(handleCreateCustomer(event.request));
                } else if (customerId && quotesOrPolicies === 'quotes') { // Handle /customers/:customerId/quotes
                    if (!quoteOrPolicyId && method === 'POST') {  // Start Quote: /customers/:customerId/quotes
                        console.log("Entra en quotes post");
                        event.respondWith(handleStartQuote(customerId, event.request));
                    } else if (quoteOrPolicyId && !action && method === 'PUT') { // Update Quote: /customers/:customerId/quotes/:quoteId
                        console.log("Entra en quotes put");
                        event.respondWith(handleUpdateQuote(customerId, quoteOrPolicyId, event.request));
                    } else if (quoteOrPolicyId && action === 'calculate' && method === 'POST') { // Calculate: /customers/:customerId/quotes/:quoteId/calculate
                        event.respondWith(handleCalculatePremium(customerId, quoteOrPolicyId));
                    } else if (quoteOrPolicyId && action === 'accept' && method === 'POST') { // Accept: /customers/:customerId/quotes/:quoteId/accept
                        event.respondWith(handleAcceptQuote(customerId, quoteOrPolicyId, event.request));
                    }
                } else if (customerId && quotesOrPolicies === 'policies') { //Handle /customers/:customerId/policies
                    if (quoteOrPolicyId && !action && method === 'GET') {  // Get Policy: /customers/:customerId/policies/:policyId
                        event.respondWith(handleGetPolicy(customerId, quoteOrPolicyId));
                    }else if (quoteOrPolicyId && action === 'renewal' && method === 'GET') { // Renewal Info: /customers/:customerId/policies/:policyId/renewal
                        event.respondWith(handleGetRenewalInfo(customerId, quoteOrPolicyId));
                    } else if (quoteOrPolicyId && action === 'renew' && method === 'POST') { // Renew: /customers/:customerId/policies/:policyId/renew
                        event.respondWith(handleRenewPolicy(customerId, quoteOrPolicyId, event.request));
                    }
                } else if (customerId && quotesOrPolicies === 'claims') { // Handle /customers/:customerId/claims
                    if (!quoteOrPolicyId && method === 'POST') {  // File Claim: /customers/:customerId/claims
                       console.log("Entra en file claim");
                      event.respondWith(handleFileClaim(customerId, event.request));
                    } else if (quoteOrPolicyId && method === 'GET') { // Get Claim: /customers/:customerId/claims/:claimId
                      event.respondWith(handleGetClaim(customerId, quoteOrPolicyId));
                    }
                } else {
                    console.log('Service Worker: Passing request to network (Unhandled customer route):', event.request.url);
                    event.respondWith(fetch(event.request));
                }
            } else {
                console.log('Service Worker: Passing request to network (under base path, but not API):', event.request.url);
                event.respondWith(fetch(event.request));
            }
        } catch (error) {
            console.error("SW Error:", error);
            event.respondWith(new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    } else {
        console.log('Service Worker: Passing request to network (not in base path):', event.request.url);
        event.respondWith(fetch(event.request));
    }
});

// --- Helper Functions (sw.js) ---
async function handleCreateCustomer(request) {
    const body = await request.json();
    const customerId = `cust${nextCustomerId++}`; // Simple ID generation
    db.customers[customerId] = { ...body, customerId }; // Store customer
    return new Response(JSON.stringify({ customerId }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleGetProducts(){
    return new Response(JSON.stringify(db.products), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleStartQuote(customerId, request){
     const body = await request.json();
    if (!db.customers[customerId]) {
        throw new Error("Customer not found");
    }
    const quoteId = `quote${nextQuoteId++}`;
    db.quotes[quoteId] = {
        quoteId,
        customerId,
        productId: body.productId, //From the request
        status: 'draft',
        details: {} // Initial details are empty
    };
    return new Response(JSON.stringify({ quoteId }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleUpdateQuote(customerId, quoteId, request){
    if (!db.customers[customerId]) {
        throw new Error("Customer not found");
    }
    if (!db.quotes[quoteId]) {
        throw new Error("Quote not found");
    }
    const body = await request.json();
    db.quotes[quoteId].details = { ...db.quotes[quoteId].details, ...body }; //Update the details
    return new Response(JSON.stringify({success: true}), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleCalculatePremium(customerId, quoteId){
     if (!db.customers[customerId]) {
        throw new Error("Customer not found");
    }
    if (!db.quotes[quoteId]) {
        throw new Error("Quote not found");
    }
    //Very simple mock calculation
    const premium = Math.floor(Math.random() * 1000) + 500; //Random between 500 - 1500
    db.quotes[quoteId].premium = premium;
    db.quotes[quoteId].status = 'calculated';

    return new Response(JSON.stringify({ premium: premium }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleAcceptQuote(customerId, quoteId, request){
    if (!db.customers[customerId]) {
        throw new Error("Customer not found");
    }
    if (!db.quotes[quoteId]) {
        throw new Error("Quote not found");
    }
    if(db.quotes[quoteId].status !== 'calculated'){
        throw new Error("Quote is not in 'calculated' status. Cannot accept.");
    }
    const policyId = `policy${nextPolicyId++}`;
    db.policies[policyId] = {
        policyId,
        customerId,
        quoteId,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString() // One year later
    };

     //Clean quote
    delete db.quotes[quoteId];

    return new Response(JSON.stringify({ policyId }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleGetPolicy(customerId, policyId){
    if (!db.customers[customerId]) {
        throw new Error("Customer not found");
    }
   if (!db.policies[policyId]) {
        throw new Error("Policy not found");
    }
    return new Response(JSON.stringify(db.policies[policyId]), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleFileClaim(customerId, request){
    if (!db.customers[customerId]) {
        throw new Error("Customer not found");
    }
    const body = await request.json();
    if(!db.policies[body.policyId]){
         throw new Error("Policy not found");
    }

    const claimId = `claim${nextClaimId++}`; // Simple ID generation
    db.claims[claimId] = {
        claimId,
        customerId,
        policyId: body.policyId,
        status: 'open',
        description: body.description,
        date: new Date().toISOString()
    };
    return new Response(JSON.stringify({ claimId }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleGetClaim(customerId, claimId){
 if (!db.customers[customerId]) {
        throw new Error("Customer not found");
    }
    if (!db.claims[claimId]) {
        throw new Error("Claim not found");
    }

    return new Response(JSON.stringify(db.claims[claimId]), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleGetRenewalInfo(customerId, policyId){
 if (!db.customers[customerId]) {
        throw new Error("Customer not found");
    }
    if (!db.policies[policyId]) {
        throw new Error("Policy not found");
    }

    const policy = db.policies[policyId];
     // Check if the policy is near its end date (e.g., within 30 days)
    const endDate = new Date(policy.endDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let renewalInfo = {};
    if(diffDays <= 30){
         const newPremium = Math.floor(Math.random() * 1000) + 500; // Random
        renewalInfo = {
            policyId: policyId,
            newStartDate: endDate.toISOString(),
            newEndDate: new Date(new Date(endDate).setFullYear(endDate.getFullYear() + 1)).toISOString(),
            newPremium: newPremium,
            status: 'available'
        }
    } else {
        renewalInfo = {status: 'not_available'}
    }
      return new Response(JSON.stringify(renewalInfo), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleRenewPolicy(customerId, policyId, request){
 if (!db.customers[customerId]) {
        throw new Error("Customer not found");
    }
    if (!db.policies[policyId]) {
        throw new Error("Policy not found");
    }
     const policy = db.policies[policyId];
     // Check if the policy is near its end date (e.g., within 30 days)
    const endDate = new Date(policy.endDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if(diffDays > 30){
        throw new Error("Policy is not renewable yet");
    }
     //Update policy
    policy.startDate = endDate.toISOString();
    policy.endDate = new Date(new Date(endDate).setFullYear(endDate().getFullYear() + 1)).toISOString(); // One year later

    return new Response(JSON.stringify({success: true}), {
        headers: { 'Content-Type': 'application/json' }
    });
}