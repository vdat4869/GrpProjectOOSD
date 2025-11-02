using MediatR;
using AccountOwnershipService.DTOs;

namespace AccountOwnershipService.Commands;

public class SignEContractCommand : IRequest<EContractDto>
{
    public Guid Id { get; set; }
    public string DigitalSignature { get; set; } = string.Empty;

    public SignEContractCommand(Guid id, string digitalSignature)
    {
        Id = id;
        DigitalSignature = digitalSignature;
    }
}

