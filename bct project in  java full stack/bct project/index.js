class BloodDonationDB {
    constructor() {
        this.donors = JSON.parse(localStorage.getItem('donors')) || [];
        this.donations = JSON.parse(localStorage.getItem('donations')) || [];
        this.inventory = JSON.parse(localStorage.getItem('inventory')) || this.initializeInventory();
        this.nextDonorId = parseInt(localStorage.getItem('nextDonorId')) || 1;
        this.nextDonationId = parseInt(localStorage.getItem('nextDonationId')) || 1;
    }

    initializeInventory() {
        const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        return bloodTypes.map(type => ({
            bloodType: type,
            units: Math.floor(Math.random() * 20) + 5,
            lastUpdated: new Date().toISOString().split('T')[0]
        }));
    }

    save() {
        localStorage.setItem('donors', JSON.stringify(this.donors));
        localStorage.setItem('donations', JSON.stringify(this.donations));
        localStorage.setItem('inventory', JSON.stringify(this.inventory));
        localStorage.setItem('nextDonorId', this.nextDonorId.toString());
        localStorage.setItem('nextDonationId', this.nextDonationId.toString());
    }

    addDonor(donor) {
        donor.id = this.nextDonorId++;
        donor.registrationDate = new Date().toISOString().split('T')[0];
        donor.lastDonation = null;
        this.donors.push(donor);
        this.save();
        return donor;
    }

    addDonation(donation) {
        const donor = this.donors.find(d => d.id == donation.donorId);
        if (!donor) return null;

        donation.id = this.nextDonationId++;
        donation.donorName = donor.name;
        donation.bloodType = donor.bloodType;
        this.donations.push(donation);

        donor.lastDonation = donation.date;

        const inventoryItem = this.inventory.find(i => i.bloodType === donor.bloodType);
        if (inventoryItem) {
            inventoryItem.units += parseInt(donation.units);
            inventoryItem.lastUpdated = new Date().toISOString().split('T')[0];
        }

        this.save();
        return donation;
    }

    getDonors() {
        return this.donors;
    }

    getDonations() {
        return this.donations;
    }

    getInventory() {
        return this.inventory;
    }

    searchDonors(name, bloodType) {
        return this.donors.filter(donor => {
            const nameMatch = !name || donor.name.toLowerCase().includes(name.toLowerCase());
            const bloodMatch = !bloodType || donor.bloodType === bloodType;
            return nameMatch && bloodMatch;
        });
    }

    getDonorDonationCount(donorId) {
        return this.donations.filter(d => d.donorId == donorId).length;
    }
}

// Initialize database
const db = new BloodDonationDB();

// Tab functionality
function showTab(tabName, event = null) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    if (event) event.target.classList.add('active');

    if (tabName === 'dashboard') updateDashboard();
    else if (tabName === 'donors') updateDonorsTable();
    else if (tabName === 'donations') updateDonationsTable();
    else if (tabName === 'inventory') updateInventoryDisplay();
    else if (tabName === 'search') clearSearch();
}

// Donor registration
document.getElementById('donorForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const donor = {
        name: document.getElementById('donorName').value,
        age: parseInt(document.getElementById('donorAge').value),
        gender: document.getElementById('donorGender').value,
        bloodType: document.getElementById('donorBloodType').value,
        phone: document.getElementById('donorPhone').value,
        email: document.getElementById('donorEmail').value,
        address: document.getElementById('donorAddress').value
    };

    const addedDonor = db.addDonor(donor);
    showAlert('donorAlert', `Donor registered successfully! ID ${addedDonor.id}`, 'success');
    clearDonorForm();
    updateDonorsTable();
    updateDashboard();
});

// Donation recording
document.getElementById('donationForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const donation = {
        donorId: parseInt(document.getElementById('donationDonorId').value),
        date: document.getElementById('donationDate').value,
        units: parseInt(document.getElementById('donationUnits').value),
        notes: document.getElementById('donationNotes').value
    };

    const addedDonation = db.addDonation(donation);
    if (addedDonation) {
        showAlert('donationAlert', 'Donation recorded successfully!', 'success');
        clearDonationForm();
        updateDonationsTable();
        updateDashboard();
        updateInventoryDisplay();
    } else {
        showAlert('donationAlert', 'Error: Donor ID not found!', 'danger');
    }
});

// Update dashboard
function updateDashboard() {
    const donors = db.getDonors();
    const donations = db.getDonations();
    const inventory = db.getInventory();

    document.getElementById('totalDonors').textContent = donors.length;
    document.getElementById('totalDonations').textContent = donations.length;
    document.getElementById('availableUnits').textContent = inventory.reduce((sum, item) => sum + item.units, 0);
    document.getElementById('criticalTypes').textContent = inventory.filter(item => item.units < 10).length;

    const recentDonations = [...donations].slice(-5).reverse();
    const tbody = document.querySelector('#recentDonationsTable tbody');
    tbody.innerHTML = '';

    recentDonations.forEach(donation => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${donation.date}</td>
            <td>${donation.donorName}</td>
            <td><span class="blood-type">${donation.bloodType}</span></td>
            <td>${donation.units}</td>
            <td><span class="status available">Processed</span></td>
        `;
    });
}

// Update donors table
function updateDonorsTable() {
    const donors = db.getDonors();
    const tbody = document.querySelector('#donorsTable tbody');
    tbody.innerHTML = '';

    donors.forEach(donor => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${donor.id}</td>
            <td>${donor.name}</td>
            <td>${donor.age}</td>
            <td>${donor.gender}</td>
            <td><span class="blood-type">${donor.bloodType}</span></td>
            <td>${donor.phone}</td>
            <td>${donor.lastDonation || 'Never'}</td>
            <td><button class="btn btn-success" onclick="quickDonation(${donor.id})">Quick Donate</button></td>
        `;
    });
}

// Update donations table
function updateDonationsTable() {
    const donations = [...db.getDonations()].reverse();
    const tbody = document.querySelector('#donationsTable tbody');
    tbody.innerHTML = '';

    donations.forEach(donation => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${donation.id}</td>
            <td>${donation.donorId}</td>
            <td>${donation.donorName}</td>
            <td><span class="blood-type">${donation.bloodType}</span></td>
            <td>${donation.date}</td>
            <td>${donation.units}</td>
            <td>${donation.notes || '-'}</td>
        `;
    });
}

// Update inventory display
function updateInventoryDisplay() {
    const inventory = db.getInventory();

    inventory.forEach(item => {
        const element = document.getElementById(`inventory${item.bloodType}`);
        if (element) element.textContent = item.units;
    });

    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';

    inventory.forEach(item => {
        let status = 'available';
        let statusText = 'Available';

        if (item.units < 5) {
            status = 'critical';
            statusText = 'Critical';
        } else if (item.units < 10) {
            status = 'low';
            statusText = 'Low Stock';
        }

        const row = tbody.insertRow();
        row.innerHTML = `
            <td><span class="blood-type">${item.bloodType}</span></td>
            <td>${item.units}</td>
            <td><span class="status ${status}">${statusText}</span></td>
            <td>${item.lastUpdated}</td>
            <td>
                <button class="btn btn-primary" onclick="adjustInventory('${item.bloodType}', 1)">+1</button>
                <button class="btn btn-secondary" onclick="adjustInventory('${item.bloodType}', -1)">-1</button>
            </td>
        `;
    });
}

// Search functionality
function performSearch() {
    const name = document.getElementById('searchName').value;
    const bloodType = document.getElementById('searchBloodType').value;
    const results = db.searchDonors(name, bloodType);

    const tbody = document.querySelector('#searchResultsTable tbody');
    tbody.innerHTML = '';

    results.forEach(donor => {
        const donationCount = db.getDonorDonationCount(donor.id);
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${donor.id}</td>
            <td>${donor.name}</td>
            <td><span class="blood-type">${donor.bloodType}</span></td>
            <td>${donor.phone}</td>
            <td>${donor.lastDonation || 'Never'}</td>
            <td>${donationCount}</td>
        `;
    });
}

function clearSearch() {
    document.getElementById('searchName').value = '';
    document.getElementById('searchBloodType').value = '';
    document.querySelector('#searchResultsTable tbody').innerHTML = '';
}

// Utility functions
function clearDonorForm() {
    document.getElementById('donorForm').reset();
}

function clearDonationForm() {
    document.getElementById('donationForm').reset();
    document.getElementById('donationDate').value = new Date().toISOString().split('T')[0];
}

function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => container.innerHTML = '', 5000);
}

function quickDonation(donorId) {
    showTab('donations');
    document.getElementById('donationDonorId').value = donorId;
    document.getElementById('donationDate').value = new Date().toISOString().split('T')[0];
    document.querySelector('.nav-tab:nth-child(3)').classList.add('active');
}

function adjustInventory(bloodType, change) {
    const inventory = db.getInventory();
    const item = inventory.find(i => i.bloodType === bloodType);
    if (item) {
        item.units = Math.max(0, item.units + change);
        item.lastUpdated = new Date().toISOString().split('T')[0];
        db.save();
        updateInventoryDisplay();
        updateDashboard();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString();
    document.getElementById('donationDate').value = new Date().toISOString().split('T')[0];

    updateDashboard();
    updateDonorsTable();
    updateDonationsTable();
    updateInventoryDisplay();
});
