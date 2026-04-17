import { useState } from 'react'
import { supabase } from './supabase'
import type { Visit } from './types'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import './App.css'

function App() {
  const [view, setView] = useState<'home' | 'archive' | 'new' | 'exit'>('home')
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [operatorsCount, setOperatorsCount] = useState(1)

  const fetchVisits = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('visits').select('*').order('entry_date', { ascending: false })
    if (error) {
      alert('Error fetching visits: ' + error.message)
    } else {
      setVisits(data || [])
    }
    setLoading(false)
  }

  const handleNewVisit = async (companyName: string, operatorsCount: number) => {
    const entryDate = new Date().toISOString()
    const { error } = await supabase.from('visits').insert({
      company_name: companyName,
      operators_count: operatorsCount,
      entry_date: entryDate,
      status: 'active'
    })
    if (error) {
      alert('Error creating visit: ' + error.message)
    } else {
      alert('Visit registered!')
      setView('home')
    }
  }

  const handleExit = async (id: number) => {
    const exitDate = new Date().toISOString()
    const { error } = await supabase.from('visits').update({
      exit_date: exitDate,
      status: 'exited'
    }).eq('id', id)
    if (error) {
      alert('Error updating exit: ' + error.message)
    } else {
      alert('Exit confirmed!')
      fetchVisits() // Refresh the list
    }
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const tableColumn = ['ID', 'Nome Azienda', 'Operatori', 'Data Entrata', 'Data Uscita', 'Stato']
    const tableRows: (string | number)[][] = []

    visits.forEach(visit => {
      const visitData = [
        visit.id,
        visit.company_name,
        visit.operators_count,
        new Date(visit.entry_date).toLocaleString(),
        visit.exit_date ? new Date(visit.exit_date).toLocaleString() : 'N/A',
        visit.status
      ]
      tableRows.push(visitData)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(doc as any).autoTable(tableColumn, tableRows, { startY: 20 })
    doc.text('Archivio Visite', 14, 15)
    doc.save('archivio_visite.pdf')
  }

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(visits.map(visit => ({
      ID: visit.id,
      'Nome Azienda': visit.company_name,
      Operatori: visit.operators_count,
      'Data Entrata': new Date(visit.entry_date).toLocaleString(),
      'Data Uscita': visit.exit_date ? new Date(visit.exit_date).toLocaleString() : 'N/A',
      Stato: visit.status
    })))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Visite')
    XLSX.writeFile(workbook, 'archivio_visite.xlsx')
  }

  const renderHome = () => (
    <div className="home">
      <h1>Gestione Presenza Ditte Esterne</h1>
      <button onClick={() => { setView('archive'); fetchVisits() }}>Archivio</button>
      <button onClick={() => setView('new')}>Nuova Registrazione</button>
      <button onClick={() => { setView('exit'); fetchVisits() }}>Uscita</button>
    </div>
  )

  const renderArchive = () => (
    <div className="archive">
      <h1>Archivio</h1>
      <button onClick={() => setView('home')}>Torna alla Home</button>
      <button onClick={exportToPDF}>Scarica PDF</button>
      <button onClick={exportToExcel}>Scarica Excel</button>
      {loading ? <p>Loading...</p> : (
        <ul>
          {visits.map(visit => (
            <li key={visit.id}>
              {visit.company_name} - {visit.operators_count} operatori - Entrata: {new Date(visit.entry_date).toLocaleString()} - Uscita: {visit.exit_date ? new Date(visit.exit_date).toLocaleString() : 'Ancora attivo'} - Status: {visit.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const renderNew = () => (
    <div className="new">
      <h1>Nuova Registrazione</h1>
      <button onClick={() => setView('home')}>Torna alla Home</button>
      <form onSubmit={(e) => { e.preventDefault(); handleNewVisit(companyName, operatorsCount); setCompanyName(''); setOperatorsCount(1) }}>
        <label>
          Nome Azienda:
          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </label>
        <label>
          Numero Operatori:
          <input type="number" min="1" value={operatorsCount} onChange={(e) => setOperatorsCount(parseInt(e.target.value))} required />
        </label>
        <button type="submit">Registra</button>
      </form>
    </div>
  )

  const renderExit = () => {
    const activeVisits = visits.filter(v => v.status === 'active')
    return (
      <div className="exit">
        <h1>Uscita</h1>
        <button onClick={() => setView('home')}>Torna alla Home</button>
        {loading ? <p>Loading...</p> : activeVisits.length === 0 ? <p>Nessuna visita attiva</p> : (
          <ul>
            {activeVisits.map(visit => (
              <li key={visit.id}>
                {visit.company_name} - {visit.operators_count} operatori - Entrata: {new Date(visit.entry_date).toLocaleString()}
                <button onClick={() => handleExit(visit.id)}>Conferma Uscita</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="app">
      {view === 'home' && renderHome()}
      {view === 'archive' && renderArchive()}
      {view === 'new' && renderNew()}
      {view === 'exit' && renderExit()}
    </div>
  )
}

export default App
