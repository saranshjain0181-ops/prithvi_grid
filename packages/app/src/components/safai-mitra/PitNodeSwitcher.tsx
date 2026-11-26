import React, { useState } from 'react'
import { useUiStore } from '@/store/ui.store'

interface PitNodeSwitcherProps {
  boxes: Array<{
    id: string
    name: string
    nodes: Array<{ id: string; label: string }>
  }>
}

export const PitNodeSwitcher: React.FC<PitNodeSwitcherProps> = ({ boxes }) => {
  const { selectedBoxId, selectedNodeId, setSelectedBox, setSelectedNode } = useUiStore()
  const [isOpen, setIsOpen] = useState(false)

  const selectedBox = boxes.find((b) => b.id === selectedBoxId) || boxes[0]
  const selectedNode =
    selectedBox?.nodes.find((n) => n.id === selectedNodeId) || selectedBox?.nodes[0]

  const handleSelect = (boxId: string, nodeId: string) => {
    setSelectedBox(boxId)
    setSelectedNode(nodeId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-2xl px-4 py-2.5 font-bold font-devanagari text-base border border-white/30"
      >
        <span>📍</span>
        <span>{selectedBox?.name || 'बॉक्स चुनें'}</span>
        {selectedNode && (
          <span className="opacity-80 text-sm">· {selectedNode.label}</span>
        )}
        <span className="ml-1 opacity-80">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 min-w-64 overflow-hidden">
          {boxes.map((box) => (
            <div key={box.id}>
              <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                {box.name}
              </div>
              {box.nodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleSelect(box.id, node.id)}
                  className={`
                    w-full text-left px-5 py-3 font-semibold font-devanagari text-base
                    transition-colors hover:bg-green-50
                    ${selectedBoxId === box.id && selectedNodeId === node.id
                      ? 'text-prithvi-green bg-green-50'
                      : 'text-prithvi-slate'
                    }
                  `}
                >
                  {node.label}
                  {selectedBoxId === box.id && selectedNodeId === node.id && (
                    <span className="ml-2 text-prithvi-green">✓</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
