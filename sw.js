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

        try {
            if (relativePath.startsWith('customers') && method === 'POST') {
                // Create Customer
                console.log("Entra en customers post");
                event.respondWith(handleCreateCustomer(event.request));
            } else if (relativePath === 'products' && method === 'GET') {
                // Get Products
                event.respondWith(handleGetProducts());
            } else if (relativePath.startsWith('customers') && relativePath.includes('quotes') && method === 'POST') {
                // Start Quote
                console.log("Entra en quotes post");
                const customerId = relativePath.split('/')[1]; // Extract customerId
                event.respondWith(handleStartQuote(customerId, event.request));
            } else if (relativePath.startsWith('customers') && relativePath.includes('quotes') && method === 'PUT') {
                // Update Quote
                const [_, customerId, __, quoteId] = relativePath.split('/'); // Extract customerId and quoteId
                console.log("Entra en quotes put");
                event.respondWith(handleUpdateQuote(customerId, quoteId, event.request));
            } else if (relativePath.startsWith('customers') && relativePath.includes('quotes') && relativePath.includes('calculate') && method === 'POST') {
                // Calculate Premium
                const [_, customerId, __, quoteId] = relativePath.split('/'); // Extract customerId and quoteId
                event.respondWith(handleCalculatePremium(customerId, quoteId));
            } else if (relativePath.startsWith('customers') && relativePath.includes('quotes') && relativePath.includes('accept') && method === 'POST') {
                // Accept Quote
                const [_, customerId, __, quoteId] = relativePath.split('/'); // Extract customerId and quoteId
                event.respondWith(handleAcceptQuote(customerId, quoteId, event.request));
           } else if (relativePath.startsWith('customers') && relativePath.includes('policies') && method === 'GET') {
                // Get Policy
               const [_, customerId, __, policyId] = relativePath.split('/'); // Extract customerId and quoteId
                event.respondWith(handleGetPolicy(customerId, policyId));
            } else if (relativePath.startsWith('customers') && relativePath.includes('claims') && method === 'POST') {
                // File a Claim
                const customerId = relativePath.split('/')[1];
                event.respondWith(handleFileClaim(customerId, event.request));
            } else if (relativePath.startsWith('customers') && relativePath.includes('claims') && method === 'GET') {
                // Get Claim
                const [_, customerId, __, claimId] = relativePath.split('/'); // Extract customerId and quoteId
                event.respondWith(handleGetClaim(customerId, claimId));
            } else if (relativePath.startsWith('customers') && relativePath.includes('policies') && relativePath.includes('renewal') && method === 'GET') {
                // Get Renewal Info
                const [_, customerId, __, policyId] = relativePath.split('/'); // Extract customerId and quoteId
                event.respondWith(handleGetRenewalInfo(customerId, policyId));
            } else if (relativePath.startsWith('customers') && relativePath.includes('policies') && relativePath.includes('renew') && method === 'POST') {
                // Renew Policy
                const [_, customerId, __, policyId] = relativePath.split('/'); // Extract customerId and quoteId
                event.respondWith(handleRenewPolicy(customerId, policyId, event.request));
            }
            else {
                console.log('Service Worker: Passing request to network (under base path, but not API):', event.request.url);
                event.respondWith(fetch(event.request));
            }
        }catch(error){
            event.respondWith(new Response(JSON.stringify({ error: error.message }), {
                    status: 400, // Or appropriate error code
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
    policy.endDate = new Date(new Date(endDate).setFullYear(endDate.getFullYear() + 1)).toISOString(); // One year later

    return new Response(JSON.stringify({success: true}), {
        headers: { 'Content-Type': 'application/json' }
    });
}