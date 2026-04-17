// 1. Configurazione e Inizializzazione
const SUB_URL = "https://vnzrewcbnoqbqvzckome.supabase.co";
const SUB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenJld2Nibm9xYnF2emNrb21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njk2NDUsImV4cCI6MjA4NjU0NTY0NX0.pdnPyYB4DwEjZ10aF3tGigAjiwLGkP-kx07-15L4ass";

const _supabase = supabase.createClient(SUB_URL, SUB_KEY);

// 2. Funzioni di Navigazione
function showSection(id) {
    document.querySelectorAll('section, nav').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    
    // Se entriamo nella sezione entrata, ricarichiamo la lista ditte per sicurezza
    if(id === 'section-entrata') popolaSelectDitte();
}

// 3. CARICAMENTO DINAMICO DITTE (Dalla tua nuova tabella)
async function popolaSelectDitte() {
    const select = document.getElementById('ent-azienda');
    if(!select) return;

    // Recupera i dati dalla tabella Elenco_Ditte_Esterne
    const { data, error } = await _supabase
        .from('Elenco_Ditte_Esterne')
        .select('Azienda')
        .order('Azienda', { ascending: true });

    if (error) {
        console.error("Errore caricamento ditte:", error);
        select.innerHTML = '<option value="">⚠️ Errore database</option>';
        return;
    }

    // Costruisce le opzioni
    let options = '<option value="">-- Seleziona Azienda --</option>';
    data.forEach(ditta => {
        options += `<option value="${ditta.Azienda}">${ditta.Azienda}</option>`;
    });
    select.innerHTML = options;
}

// 4. LOGICA INGRESSO
async function salvaEntrata() {
    const azienda = document.getElementById('ent-azienda').value;
    const operatori = document.getElementById('ent-operatori').value;

    if (!azienda) {
        alert("Per favore, seleziona un'azienda dall'elenco.");
        return;
    }

    const { error } = await _supabase.from('visits').insert([
        { 
            company_name: azienda, 
            operators_count: parseInt(operatori), 
            status: 'active',
            entry_date: new Date().toISOString()
        }
    ]);

    if (!error) {
        alert("Ingresso registrato!");
        showSection('home');
    } else {
        alert("Errore nell'invio dei dati.");
    }
}

// 5. LOGICA USCITA (Ditte attualmente in sede)
async function caricaPresenti() {
    const container = document.getElementById('lista-presenti');
    container.innerHTML = "<p>Verifica ditte in sede...</p>";

    const { data, error } = await _supabase
        .from('visits')
        .select('*')
        .eq('status', 'active');

    if (data.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#888;'>Nessuna ditta presente.</p>";
        return;
    }

    container.innerHTML = "";
    data.forEach(item => {
        const ora = new Date(item.entry_date).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
        container.innerHTML += `
            <div class="card-visita">
                <div>
                    <strong>${item.company_name}</strong><br>
                    <small>Entrata: ${ora} (${item.operators_count} pers.)</small>
                </div>
                <button onclick="salvaUscita(${item.id})">ESCI</button>
            </div>`;
    });
}

async function salvaUscita(id) {
    const { error } = await _supabase
        .from('visits')
        .update({ exit_date: new Date().toISOString(), status: 'closed' })
        .eq('id', id);

    if (!error) caricaPresenti();
}

// 6. ARCHIVIO E EXPORT
let datiArchivio = [];

async function caricaArchivio() {
    const container = document.getElementById('tabella-archivio');
    const { data, error } = await _supabase
        .from('visits')
        .select('*')
        .order('entry_date', { ascending: false });

    if (!error) {
        datiArchivio = data;
        let html = `<table><thead><tr><th>Ditta</th><th>Data</th><th>In</th><th>Out</th></tr></thead><tbody>`;
        data.forEach(d => {
            const dataGiorno = new Date(d.entry_date).toLocaleDateString('it-IT');
            const oraIn = new Date(d.entry_date).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
            const oraOut = d.exit_date ? new Date(d.exit_date).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}) : '--:--';
            html += `<tr><td>${d.company_name}</td><td>${dataGiorno}</td><td>${oraIn}</td><td>${oraOut}</td></tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    }
}

// Funzioni Export (Excel/PDF)
function downloadExcel() {
    const ws = XLSX.utils.json_to_sheet(datiArchivio);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visite");
    XLSX.writeFile(wb, "Report_Accessi_PT.xlsx");
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Registro Accessi Ditte Esterne", 10, 10);
    const rows = datiArchivio.map(d => [d.company_name, d.entry_date, d.exit_date || 'In sede']);
    doc.autoTable({ head: [['Azienda', 'Ingresso', 'Uscita']], body: rows });
    doc.save("Report_Accessi.pdf");
}

// Inizializzazione automatica
document.addEventListener('DOMContentLoaded', () => {
    popolaSelectDitte();
});