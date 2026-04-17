// Configurazione Supabase
const SUB_URL = "https://vnzrewcbnoqbqvzckome.supabase.co";
const SUB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenJld2Nibm9xYnF2emNrb21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njk2NDUsImV4cCI6MjA4NjU0NTY0NX0.pdnPyYB4DwEjZ10aF3tGigAjiwLGkP-kx07-15L4ass";

// Inizializzazione Client
const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

// Funzione per navigare tra le sezioni
function showSection(id) {
    document.querySelectorAll('section, nav').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// 1. REGISTRA ENTRATA
async function salvaEntrata() {
    const nome = document.getElementById('ent-azienda').value;
    const num = document.getElementById('ent-operatori').value;

    if (!nome || !num) {
        alert("Inserisci tutti i dati!");
        return;
    }

    const { error } = await _supabase.from('visits').insert([
        { company_name: nome, operators_count: parseInt(num), status: 'active' }
    ]);

    if (!error) {
        alert("Entrata registrata con successo!");
        document.getElementById('ent-azienda').value = "";
        showSection('home');
    } else {
        console.error(error);
        alert("Errore durante il salvataggio.");
    }
}

// 2. CARICA DITTE PRESENTI (Gestione Uscita)
async function caricaPresenti() {
    const container = document.getElementById('lista-presenti');
    container.innerHTML = "<p>Caricamento in corso...</p>";

    const { data, error } = await _supabase
        .from('visits')
        .select('*')
        .eq('status', 'active');

    if (error) {
        container.innerHTML = "Errore nel caricamento dei dati.";
        return;
    }

    if (data.length === 0) {
        container.innerHTML = "<p>Nessuna ditta presente al momento.</p>";
        return;
    }

    container.innerHTML = "";
    data.forEach(item => {
        const dataIngresso = new Date(item.entry_date).toLocaleString('it-IT');
        container.innerHTML += `
            <div class="card">
                <div>
                    <strong>${item.company_name}</strong><br>
                    <small>${item.operators_count} persone - Entrata: ${dataIngresso}</small>
                </div>
                <button onclick="salvaUscita(${item.id})">Esci</button>
            </div>`;
    });
}

async function salvaUscita(id) {
    const { error } = await _supabase
        .from('visits')
        .update({ exit_date: new Date().toISOString(), status: 'closed' })
        .eq('id', id);

    if (!error) {
        caricaPresenti();
    } else {
        alert("Errore nella registrazione uscita.");
    }
}

// 3. ARCHIVIO
let datiArchivio = [];

async function caricaArchivio() {
    const container = document.getElementById('tabella-archivio');
    container.innerHTML = "Caricamento storico...";

    const { data, error } = await _supabase
        .from('visits')
        .select('*')
        .order('entry_date', { ascending: false });

    if (!error) {
        datiArchivio = data;
        if (data.length === 0) {
            container.innerHTML = "L'archivio è vuoto.";
            return;
        }

        let html = `<table>
            <thead>
                <tr>
                    <th>Ditta</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Pers.</th>
                </tr>
            </thead>
            <tbody>`;
        
        data.forEach(d => {
            const dateIn = new Date(d.entry_date).toLocaleDateString('it-IT');
            const dateOut = d.exit_date ? new Date(d.exit_date).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}) : '-';
            html += `<tr>
                <td>${d.company_name}</td>
                <td>${dateIn}</td>
                <td>${dateOut}</td>
                <td>${d.operators_count}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    }
}

// Funzioni Export
function downloadExcel() {
    if(datiArchivio.length === 0) return alert("Nessun dato da esportare");
    const ws = XLSX.utils.json_to_sheet(datiArchivio);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visite");
    XLSX.writeFile(wb, "Report_Accessi.xlsx");
}

function downloadPDF() {
    if(datiArchivio.length === 0) return alert("Nessun dato da esportare");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Registro Accessi Ditte Esterne", 10, 10);
    const rows = datiArchivio.map(d => [
        d.company_name, 
        d.operators_count, 
        new Date(d.entry_date).toLocaleString(), 
        d.exit_date ? new Date(d.exit_date).toLocaleString() : 'In corso'
    ]);
    doc.autoTable({ head: [['Ditta', 'Pers', 'Ingresso', 'Uscita']], body: rows });
    doc.save("Report_Accessi.pdf");
}

// Registrazione Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => console.log("SW non registrato, ignorabile in locale"));
}