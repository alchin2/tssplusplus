import type { Course } from "../types";

export const COURSES: Course[] = [
  { id: "cse100", code: "CSE 100", title: "Advanced Data Structures", units: 4, dept: "CSE",
    description: "Skip lists, treaps, red-black trees, splay trees, priority queues, binomial queues, hash tables.",
    offeredThisQuarter: true, color: "#3b82f6",
    sections: [
      { id: "A00", instructor: "Moshiri, N.", meetings: [
          { type: "LE", days: ["M","W","F"], start: 12.0, end: 12.833, room: "CENTR 109" },
          { type: "DI", days: ["Tu"],        start: 9.0,  end: 9.5,   room: "WLH 2005"  }], enrolled: 87,  capacity: 105, waitlist: 0  },
      { id: "B00", instructor: "Xu, L.",      meetings: [
          { type: "LE", days: ["Tu","Th"],   start: 11.0, end: 12.333, room: "CENTR 115"  },
          { type: "DI", days: ["W"],         start: 14.0, end: 14.5,   room: "EBU3B 2154" }], enrolled: 105, capacity: 105, waitlist: 12 },
      { id: "C00", instructor: "STAFF",       meetings: [
          { type: "LE", days: ["M","W","F"], start: 10.0, end: 10.833, room: "HSS 1330" },
          { type: "DI", days: ["Th"],        start: 16.0, end: 16.5,   room: "WLH 2204" }], enrolled: 61,  capacity: 105, waitlist: 0  },
    ] },
  { id: "cse101", code: "CSE 101", title: "Design and Analysis of Algorithms", units: 4, dept: "CSE",
    description: "Efficient algorithm design: sorting, searching, graph algorithms. NP-completeness, reductions.",
    offeredThisQuarter: true, color: "#8b5cf6",
    sections: [
      { id: "A00", instructor: "Impagliazzo, R.", meetings: [
          { type: "LE", days: ["Tu","Th"], start: 9.5,  end: 10.833, room: "WLH 2001" },
          { type: "DI", days: ["F"],       start: 11.0, end: 11.5,   room: "HSS 1346" }], enrolled: 100, capacity: 125, waitlist: 0 },
      { id: "B00", instructor: "Freund, Y.",     meetings: [
          { type: "LE", days: ["M","W","F"], start: 14.0, end: 14.833, room: "CENTR 109"  },
          { type: "DI", days: ["Tu"],        start: 17.0, end: 17.5,   room: "EBU3B 2154" }], enrolled: 118, capacity: 125, waitlist: 7 },
    ] },
  { id: "cse110", code: "CSE 110", title: "Software Engineering", units: 4, dept: "CSE",
    description: "Software life cycle: specification, design, implementation, testing. Version control, agile workflows.",
    offeredThisQuarter: true, color: "#10b981",
    sections: [
      { id: "A00", instructor: "Powell, T.", meetings: [
          { type: "LE", days: ["Tu","Th"], start: 12.5, end: 13.833, room: "PETER 110"  },
          { type: "DI", days: ["F"],       start: 13.0, end: 13.5,   room: "EBU3B 4258" }], enrolled: 95, capacity: 120, waitlist: 0 },
    ] },
  { id: "cse120", code: "CSE 120", title: "Principles of Computer Operating Systems", units: 4, dept: "CSE",
    description: "Kernel structure, concurrency, memory management, virtual memory, file systems, scheduling.",
    offeredThisQuarter: true, color: "#f59e0b",
    sections: [
      { id: "A00", instructor: "Schulman, A.", meetings: [
          { type: "LE", days: ["M","W","F"], start: 11.0, end: 11.833, room: "WLH 2001" },
          { type: "DI", days: ["Th"],        start: 9.0,  end: 9.5,    room: "WLH 2204" }], enrolled: 73, capacity: 80, waitlist: 4 },
    ] },
  { id: "cse130", code: "CSE 130", title: "Programming Languages: Principles and Paradigms", units: 4, dept: "CSE",
    description: "Functional, object-oriented, and logic paradigms. Type systems, scoping, binding, evaluation.",
    offeredThisQuarter: false, color: "#ef4444",
    sections: [
      { id: "A00", instructor: "STAFF", meetings: [
          { type: "LE", days: ["Tu","Th"], start: 14.0, end: 15.333, room: "CENTR 105"  },
          { type: "DI", days: ["W"],       start: 16.0, end: 16.5,   room: "EBU3B 2154" }], enrolled: 44, capacity: 80, waitlist: 0 },
    ] },
  { id: "math20c", code: "MATH 20C", title: "Calculus and Analytic Geometry for Science and Engineering", units: 4, dept: "MATH",
    description: "Vector geometry, partial differentiation, maxima and minima, double integration, Stoke's theorem.",
    offeredThisQuarter: true, color: "#06b6d4",
    sections: [
      { id: "A00", instructor: "Kechagias, S.", meetings: [
          { type: "LE", days: ["M","W","F"], start: 8.0,  end: 8.833, room: "WLH 2005"  },
          { type: "DI", days: ["Tu"],        start: 10.0, end: 10.5,  room: "AP&M 7218" }], enrolled: 180, capacity: 195, waitlist: 0  },
      { id: "B00", instructor: "Ni, L.",        meetings: [
          { type: "LE", days: ["Tu","Th"], start: 8.0,  end: 9.333, room: "WLH 2001"  },
          { type: "DI", days: ["F"],       start: 10.0, end: 10.5,  room: "AP&M 6402" }], enrolled: 195, capacity: 195, waitlist: 22 },
    ] },
  { id: "ece35", code: "ECE 35", title: "Introduction to Analog Design", units: 4, dept: "ECE",
    description: "Resistive circuits, node/mesh analysis, capacitors, inductors, sinusoidal steady-state, phasors.",
    offeredThisQuarter: true, color: "#f97316",
    sections: [
      { id: "A00", instructor: "Sahara, K.", meetings: [
          { type: "LE", days: ["Tu","Th"], start: 15.5, end: 16.833, room: "CENTR 109" },
          { type: "LA", days: ["W"],       start: 13.0, end: 15.0,   room: "EBU1 2206" }], enrolled: 120, capacity: 140, waitlist: 0 },
    ] },
  { id: "cogs108", code: "COGS 108", title: "Data Science in Practice", units: 4, dept: "COGS",
    description: "Data wrangling, exploratory analysis, visualization, and machine learning pipelines in Python.",
    offeredThisQuarter: true, color: "#84cc16",
    sections: [
      { id: "A00", instructor: "Donoghue, T.", meetings: [
          { type: "LE", days: ["M","W"], start: 13.0, end: 14.333, room: "YORK 2622" }], enrolled: 280, capacity: 325, waitlist: 0 },
    ] },
];
