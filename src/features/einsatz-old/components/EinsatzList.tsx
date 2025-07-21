"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useEinsatz } from "@/features/einsatz-old/hooks/useEinsatz";
import {
  Einsatz,
  EinsatzStatus,
  EinsatzSystemStatus,
  EinsatzFilter,
} from "@/features/einsatz-old/types/einsatz";

interface EinsatzListProps {
  onEditEinsatz?: (einsatz: Einsatz) => void;
  onCreateNew?: () => void;
}

export default function EinsatzList({
  onEditEinsatz,
  onCreateNew,
}: EinsatzListProps) {
  const [selectedTab, setSelectedTab] = useState<
    "eigene" | "offen" | "vergeben"
  >("eigene");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("8:00");
  const [showSpaltenOptions, setShowSpaltenOptions] = useState(false);

  const { einsaetze, loading, error, fetchEinsaetze } = useEinsatz();

  // Filter für verschiedene Tabs
  const getFilterForTab = (tab: string): EinsatzFilter => {
    switch (tab) {
      case "eigene":
        return { systemStatus: EinsatzSystemStatus.ENTWURF };
      case "offen":
        return {
          status: EinsatzStatus.OFFEN,
          systemStatus: EinsatzSystemStatus.VEROEFFENTLICHT,
        };
      case "vergeben":
        return {
          status: EinsatzStatus.VERGEBEN,
          systemStatus: EinsatzSystemStatus.VEROEFFENTLICHT,
        };
      default:
        return {};
    }
  };

  // Lade Einsätze basierend auf ausgewähltem Tab
  useEffect(() => {
    const filter = getFilterForTab(selectedTab);
    if (searchTerm) {
      filter.name = searchTerm;
    }
    fetchEinsaetze(filter);
  }, [selectedTab, searchTerm, fetchEinsaetze]);

  // Gefilterte Einsätze basierend auf Such-Begriff
  const filteredEinsaetze = einsaetze.filter((einsatz) => {
    if (searchTerm) {
      return (
        einsatz.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        einsatz.kategorie.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const getStatusColor = (status: EinsatzStatus) => {
    switch (status) {
      case EinsatzStatus.OFFEN:
        return "bg-green-100 text-green-800";
      case EinsatzStatus.VERGEBEN:
        return "bg-red-100 text-red-800";
      case EinsatzStatus.UNVOLLSTAENDIG:
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: EinsatzStatus) => {
    switch (status) {
      case EinsatzStatus.OFFEN:
        return "Offen";
      case EinsatzStatus.VERGEBEN:
        return "Vergeben";
      case EinsatzStatus.UNVOLLSTAENDIG:
        return "Eigene";
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    return time;
  };

  const getHelferStatus = (einsatz: Einsatz) => {
    const assigned = einsatz.helfer.filter((h) => h && h !== "Offen").length;
    return `${assigned}/${einsatz.anzahlHelfer}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Einsätze</h1>
          <p className="text-gray-600">
            Hier kannst du dich bei Einsätzen eintragen. Organisationen werden
            anschließend automatisch informiert.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/einsatztemplates"
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-md ${
              viewMode === "list"
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📋 Templates verwalten
          </Link>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            + Einsatz erstellen
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          {
            key: "eigene",
            label: "Eigene",
            color: "bg-blue-100 text-blue-800",
          },
          {
            key: "offen",
            label: "Offen",
            color: "bg-green-100 text-green-800",
          },
          {
            key: "vergeben",
            label: "Vergeben",
            color: "bg-red-100 text-red-800",
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as any)}
            className={`px-4 py-2 rounded-md font-medium ${
              selectedTab === tab.key
                ? tab.color
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Secondary Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded-md text-sm ${
              viewMode === "list"
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📋 Templates verwalten
          </button>
          <button
            onClick={onCreateNew}
            className="px-3 py-1 bg-black text-white rounded-md text-sm hover:bg-gray-800"
          >
            + Einsatz erstellen
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">🔍 Einsatz</span>
          <input
            type="text"
            placeholder="enthält"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          />
          <span className="text-sm text-gray-600">Fluchtwege</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">🕐 Uhrzeit Von</span>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
            aria-label="Uhrzeit Filter"
          >
            <option value="8:00">8:00</option>
            <option value="9:00">9:00</option>
            <option value="10:00">10:00</option>
          </select>
          <button className="text-blue-600 hover:text-blue-800">+</button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSpaltenOptions(!showSpaltenOptions)}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <span>⚙️ Spalten bearbeiten</span>
            <span>▼</span>
          </button>
          <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
            📄 Listenansicht
          </button>
          <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
            📅 Kalenderansicht
          </button>
        </div>
      </div>

      {/* Einsätze Tabelle */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Einsatz
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Helfer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teilnehmer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gruppe
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ort
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Lädt...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-red-500">
                  {error}
                </td>
              </tr>
            ) : filteredEinsaetze.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Keine Einsätze gefunden
                </td>
              </tr>
            ) : (
              filteredEinsaetze.map((einsatz) => (
                <tr
                  key={einsatz._id || Math.random()}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                        D
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(einsatz.datum)}{" "}
                          {formatTime(einsatz.uhrzeitVon)}-
                          {formatTime(einsatz.uhrzeitBis)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {einsatz.name} ({einsatz.kategorie})
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        einsatz.status
                      )}`}
                    >
                      {getStatusText(einsatz.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getHelferStatus(einsatz)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {einsatz.anzahlTeilnehmer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {einsatz.customFields?.find((f) => f.fieldName === "Gruppe")
                      ?.value || "VS"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {einsatz.customFields?.find((f) => f.fieldName === "Ort")
                      ?.value || "Friedhof"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onEditEinsatz?.(einsatz)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-700">Zeige 10 von 67</div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Rows per page</span>
          <select
            className="px-2 py-1 border border-gray-300 rounded-md text-sm"
            aria-label="Zeilen pro Seite"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
          <span className="text-sm text-gray-700">Page 1 of 7</span>
          <div className="flex space-x-1">
            <button className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
              «
            </button>
            <button className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
              ‹
            </button>
            <button className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
              ›
            </button>
            <button className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
