import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  getElectionBoardData,
  listElectionProvinces,
  PROVINCE_TO_JTF,
} from "@/lib/queries/election-board";
import { canWriteJtf } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/stat-tile";
import { CandidateFormDialog } from "@/components/candidate-form-dialog";
import { PartyFormDialog } from "@/components/party-form-dialog";
import { RegisteredVotersFormDialog } from "@/components/registered-voters-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { Users, Flag, Vote, Radio } from "lucide-react";

function provinceAbbreviation(province: string): string {
  return province
    .split(/\s+/)
    .filter((w) => !["del", "de", "of"].includes(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

export default async function ElectionBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ province?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const provinces = await listElectionProvinces(user);
  const { province: requestedProvince } = await searchParams;
  const province =
    requestedProvince && provinces.includes(requestedProvince)
      ? requestedProvince
      : provinces[0];

  const [jtfs, parties] = await Promise.all([
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
    prisma.party.findMany({ orderBy: { abbreviation: "asc" } }),
  ]);
  const jtfIdByName = new Map(jtfs.map((j) => [j.name, j.id]));
  const partyOptions = parties.map((p) => ({ id: p.id, abbreviation: p.abbreviation, name: p.name }));

  if (!province) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
            BARMM Parliamentary Election Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            2026 BARMM Parliamentary Election — Sept 14, 2026.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            No candidate roster on file for any province yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const board = await getElectionBoardData(user, province);
  const provinceJtfName = PROVINCE_TO_JTF[province];
  const provinceJtfId = provinceJtfName ? jtfIdByName.get(provinceJtfName) : undefined;
  const canWrite =
    user.role === "ADMIN" || (!!provinceJtfId && canWriteJtf(user, provinceJtfId));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
            BARMM Parliamentary Election Profile
          </h1>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            {provinceJtfId && (
              <RegisteredVotersFormDialog
                jtfId={provinceJtfId}
                province={province}
                municipalityOptions={board.municipalityVoterTotals}
                trigger={<Button variant="outline">Edit Registered Voters</Button>}
              />
            )}
            <PartyFormDialog trigger={<Button variant="outline">Add Party</Button>} />
            {provinceJtfId && (
              <CandidateFormDialog
                jtfId={provinceJtfId}
                province={province}
                partyOptions={partyOptions}
                trigger={<Button>Add Candidate</Button>}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {provinces.map((p) => (
          <Link
            key={p}
            href={`/election-board?province=${encodeURIComponent(p)}`}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              p === province
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {p}
          </Link>
        ))}
      </div>

      <Card className="border-primary/30">
        <CardHeader>
          <p className="font-display text-xs font-semibold tracking-widest text-primary uppercase">
            Election Profile // {provinceAbbreviation(province)}
          </p>
          <CardTitle className="text-2xl">{province} Electoral Picture</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Contestants" value={board.contestantCount} icon={Users} />
            <StatTile label="Party Labels" value={board.partyLabelCount} icon={Flag} />
            <StatTile
              label="Registered Voters"
              value={board.registeredVoters.toLocaleString()}
              icon={Users}
            />
            <StatTile
              label="Votes Encoded"
              value={board.votesEncoded.toLocaleString()}
              icon={Vote}
            />
            <StatTile label="Reporting" value={`${board.reportingPct}%`} icon={Radio} />
          </div>

          <Tabs defaultValue="leaderboard">
            <TabsList variant="line">
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="parties">Parties</TabsTrigger>
              <TabsTrigger value="candidates">Candidates</TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Candidate / Party</TableHead>
                    <TableHead className="text-right">Votes</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.leaderboard.map((c, i) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{c.nameOnBallot}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.partyName ?? "Independent"}
                          {c.sourceNote ? ` · ${c.sourceNote}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {c.votesEncoded.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-primary">
                        {c.voteSharePct === null ? "—" : `${c.voteSharePct.toFixed(1)}%`}
                      </TableCell>
                    </TableRow>
                  ))}
                  {board.leaderboard.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No candidates on file for this province yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="parties">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party</TableHead>
                    <TableHead className="text-right">Candidates Fielded</TableHead>
                    <TableHead className="text-right">Votes Encoded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.parties.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Badge variant="outline">{p.abbreviation}</Badge>{" "}
                        <span className="text-muted-foreground">{p.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {p.candidateCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono tabular-nums">
                          {p.votesEncoded.toLocaleString()}
                        </div>
                        {p.candidateVotesEncoded > 0 && p.partyListVotesEncoded > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {p.partyListVotesEncoded.toLocaleString()} party list +{" "}
                            {p.candidateVotesEncoded.toLocaleString()} candidate
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canWrite && (
                          <div className="flex justify-end gap-1">
                            <PartyFormDialog
                              initial={{ id: p.id, abbreviation: p.abbreviation, name: p.name }}
                              votesContext={
                                provinceJtfId
                                  ? {
                                      jtfId: provinceJtfId,
                                      province,
                                      votesEncoded: p.partyListVotesEncoded.toString(),
                                    }
                                  : undefined
                              }
                              trigger={
                                <Button variant="ghost" size="sm">
                                  Edit
                                </Button>
                              }
                            />
                            <DeleteButton
                              url={`/api/parties/${p.id}`}
                              confirmMessage="Delete this party? This cannot be undone."
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {board.parties.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No parties on file yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="candidates">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name on Ballot</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>COC Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.candidates.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nameOnBallot}</TableCell>
                      <TableCell>{c.district ?? "—"}</TableCell>
                      <TableCell>{c.partyAbbreviation ?? "Independent"}</TableCell>
                      <TableCell>
                        {c.isCocFiler ? (
                          <Badge variant="good">COC Filer</Badge>
                        ) : (
                          <Badge variant="outline">Unconfirmed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canWrite && provinceJtfId && (
                          <div className="flex justify-end gap-1">
                            <CandidateFormDialog
                              jtfId={provinceJtfId}
                              province={province}
                              partyOptions={partyOptions}
                              initial={{
                                id: c.id,
                                district: c.district ?? "",
                                nameOnBallot: c.nameOnBallot,
                                partyId: c.partyId ?? "",
                                isCocFiler: c.isCocFiler,
                                votesEncoded: c.votesEncoded.toString(),
                                sourceNote: c.sourceNote ?? "",
                              }}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  Edit
                                </Button>
                              }
                            />
                            <DeleteButton
                              url={`/api/candidates/${c.id}`}
                              confirmMessage="Delete this candidate? This cannot be undone."
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {board.candidates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No candidates on file for this province yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
