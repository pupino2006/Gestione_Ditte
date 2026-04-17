const SUB_URL = "https://vnzrewcbnoqbqvzckome.supabase.co";
const SUB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuenJld2Nibm9xYnF2emNrb21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njk2NDUsImV4cCI6MjA4NjU0NTY0NX0.pdnPyYB4DwEjZ10aF3tGigAjiwLGkP-kx07-15L4ass";
const supabase = supabase.createClient(SUB_URL, SUB_KEY);

// Gestione Navigazione
function showSection(id) {
    document.querySelectorAll('section, nav').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// 1. REGISTRA ENTRATA
async function salvaEntrata() {
    const nome = document.getElementById('ent-azienda').value;
    const num = document.getElementById('ent-operatori').value;

    const { error } = await supabase.from('visits').insert([
        { company_name: nome, operators_count: num, status: 'active' }
    ]);

    if (!error) {
        alert("Entrata registrata!");
        location.reload();
    }
}

// 2. CARICA DITTE PRESENTI
async function caricaPresenti() {
    const container = document.getElementById('lista-presenti');
    container.innerHTML = "Caricamento...";

    const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('status', 'active');

    container.innerHTML = data.length ? "" : "Nessuna ditta presente.";
    data.forEach(item => {
        container.innerHTML += `
            <div class="card">
                <p><strong>${item.company_name}</strong> (${item.operators_count} pers.)</p>
                <button onclick="salvaUscita(${item.id})">Registra Uscita</button>
            </div>`;
    });
}

async function salvaUscita(id) {
    const { error } = await supabase
        .from('visits')
        .update({ exit_date: new Date(), status: 'closed' })
        .eq('id', id);

    if (!error) caricaPresenti();
}

// 3. ARCHIVIO E EXPORT
let datiArchivio = [];

async function caricaArchivio() {
    const { data } = await supabase.from('visits').select('*').order('entry_date', { ascending: false });
    datiArchivio = data;
    // ... logica per mostrare a video ...
}

function downloadExcel() {
    const ws = XLSX.utils.json_to_sheet(datiArchivio);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visite");
    XLSX.writeFile(wb, "Report_Accessi.xlsx");
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Registro Accessi Ditte Esterne", 10, 10);
    const rows = datiArchivio.map(d => [d.company_name, d.operators_count, d.entry_date, d.exit_date, d.status]);
    doc.autoTable({ head: [['Ditta', 'Pers', 'Ingresso', 'Uscita', 'Stato']], body: rows });
    doc.save("Report_Accessi.pdf");
}