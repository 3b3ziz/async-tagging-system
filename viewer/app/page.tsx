"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GraphView from "@/components/graph-view"
import FeedView from "@/components/feed-view"

export default function Home() {
  const [activeTab, setActiveTab] = useState("graph")

  return (
    <main className="container mx-auto p-4 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Knowledge Graph Tagging System</h1>
        <p className="text-muted-foreground">
          Explore relationships between posts and tags through interactive visualizations
        </p>
      </header>

      <Tabs defaultValue="graph" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="graph">Graph View</TabsTrigger>
          <TabsTrigger value="feed">Feed View</TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="mt-0">
          <GraphView />
        </TabsContent>

        <TabsContent value="feed" className="mt-0">
          <FeedView />
        </TabsContent>
      </Tabs>
    </main>
  )
}
