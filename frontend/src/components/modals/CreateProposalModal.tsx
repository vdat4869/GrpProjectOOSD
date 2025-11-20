import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Select from "../form/Select";
import { ownershipService, VehicleGroup } from "../../services/ownershipService";
import { aiService, VotingSuggestionResponse } from "../../services/aiService";

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupId?: string;
}

const PROPOSAL_TYPES = [
  { value: "upgrade_battery", label: "Upgrade Battery" },
  { value: "repair", label: "Repair" },
  { value: "sell_vehicle", label: "Sell Vehicle" },
  { value: "insurance_change", label: "Insurance Change" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

const CreateProposalModal: React.FC<CreateProposalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groupId,
}) => {
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [formData, setFormData] = useState({
    vehicleGroupId: groupId || "",
    title: "",
    description: "",
    type: "other",
    details: "",
    estimatedCost: "",
    currency: "VND",
    votingStartDate: "",
    votingEndDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<VotingSuggestionResponse | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGroups();
      if (groupId) {
        setFormData((prev) => ({ ...prev, vehicleGroupId: groupId }));
      }
    }
  }, [isOpen, groupId]);

  const loadGroups = async () => {
    try {
      const data = await ownershipService.getGroups();
      setGroups(data);
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.vehicleGroupId || !formData.title || !formData.type) {
      setError("Vehicle group, title, and type are required");
      return;
    }

    try {
      setLoading(true);
      await ownershipService.createProposal(formData.vehicleGroupId, {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        details: formData.details || undefined,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : undefined,
        currency: formData.currency,
        votingStartDate: formData.votingStartDate || undefined,
        votingEndDate: formData.votingEndDate || undefined,
      });
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        vehicleGroupId: groupId || "",
        title: "",
        description: "",
        type: "other",
        details: "",
        estimatedCost: "",
        currency: "VND",
        votingStartDate: "",
        votingEndDate: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleGetAISuggestion = async () => {
    if (!formData.vehicleGroupId || !formData.type) {
      setError("Please select vehicle group and proposal type first");
      return;
    }

    try {
      setLoadingSuggestion(true);
      setError(null);
      setAiSuggestion(null);

      const proposalDetails: Record<string, any> = {};
      if (formData.estimatedCost) {
        proposalDetails.cost = parseFloat(formData.estimatedCost);
      }
      if (formData.details) {
        proposalDetails.details = formData.details;
      }
      if (formData.description) {
        proposalDetails.description = formData.description;
      }

      const suggestion = await aiService.getVotingSuggestion({
        vehicle_group_id: formData.vehicleGroupId,
        proposal_type: formData.type,
        proposal_details: proposalDetails,
      });

      if (suggestion) {
        setAiSuggestion(suggestion);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get AI suggestion");
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setAiSuggestion(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[600px] m-4">
      <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Create Proposal
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Create a new proposal for group voting.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="custom-scrollbar h-[500px] overflow-y-auto px-2 pb-3">
            {error && (
              <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <Label>
                  Vehicle Group <span className="text-error-500">*</span>
                </Label>
                <Select
                  value={formData.vehicleGroupId}
                  onChange={(value) =>
                    setFormData({ ...formData, vehicleGroupId: value })
                  }
                  disabled={!!groupId || loading}
                  required
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} - {group.vehicleName}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>
                  Title <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  disabled={loading}
                  required
                  placeholder="Enter proposal title"
                />
              </div>

              <div>
                <Label>
                  Type <span className="text-error-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                  disabled={loading}
                  required
                >
                  {PROPOSAL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={loading}
                  rows={3}
                  placeholder="Enter proposal description"
                />
              </div>

              <div>
                <Label>Details</Label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400"
                  value={formData.details}
                  onChange={(e) =>
                    setFormData({ ...formData, details: e.target.value })
                  }
                  disabled={loading}
                  rows={3}
                  placeholder="Enter additional details"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estimated Cost</Label>
                  <Input
                    type="number"
                    value={formData.estimatedCost || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, estimatedCost: e.target.value })
                    }
                    disabled={loading}
                    placeholder="0"
                    min="0"
                    step={0.01}
                  />
                </div>

                <div>
                  <Label>Currency</Label>
                  <Select
                    value={formData.currency}
                    onChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                    disabled={loading}
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </Select>
                </div>
              </div>

              {formData.vehicleGroupId && formData.type && (
                <div>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={handleGetAISuggestion}
                    disabled={loadingSuggestion}
                    className="w-full"
                  >
                    {loadingSuggestion ? "Getting AI Suggestion..." : "Get AI Voting Suggestion"}
                  </Button>
                </div>
              )}

              {aiSuggestion && (
                <div
                  className={`rounded-lg border p-4 ${
                    aiSuggestion.recommendation === "approve"
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                      : aiSuggestion.recommendation === "reject"
                      ? "border-red-200 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                      : "border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white/90">
                        AI Recommendation: {aiSuggestion.recommendation.toUpperCase()}
                      </h4>
                      <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                        {aiSuggestion.reasoning}
                      </p>
                      {aiSuggestion.risk_assessment && (
                        <div className="mt-2 space-y-1">
                          {Object.entries(aiSuggestion.risk_assessment).map(([key, value]) => (
                            <p key={key} className="text-xs text-gray-600 dark:text-gray-400">
                              {key.replace(/_/g, " ")}: <span className="font-medium">{value}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {aiSuggestion.suggested_modifications && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Suggested Modifications:
                          </p>
                          <ul className="mt-1 list-inside list-disc text-xs text-gray-600 dark:text-gray-400">
                            {Object.entries(aiSuggestion.suggested_modifications).map(([key, value]) => (
                              <li key={key}>
                                {key.replace(/_/g, " ")}: {String(value)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiSuggestion(null)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Voting Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.votingStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, votingStartDate: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label>Voting End Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.votingEndDate}
                    onChange={(e) =>
                      setFormData({ ...formData, votingEndDate: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              type="button"
            >
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Proposal"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateProposalModal;

