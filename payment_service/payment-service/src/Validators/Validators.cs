using FluentValidation;
using PaymentService.DTOs;

namespace PaymentService.Validators
{
    // Wallet validators removed with wallet feature

    public class CreateTransactionValidator : AbstractValidator<CreateTransactionDto>
    {
        public CreateTransactionValidator()
        {
            // WalletId removed with wallet feature; keep rule relaxed if DTO still contains field
            RuleFor(x => x.Type).IsInEnum().WithMessage("Invalid transaction type");
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Amount must be greater than 0");
            RuleFor(x => x.Currency).NotEmpty().Length(3).WithMessage("Currency must be 3 characters");
        }
    }

    public class CreateCostShareValidator : AbstractValidator<CreateCostShareDto>
    {
        public CreateCostShareValidator()
        {
            RuleFor(x => x.GroupId).NotEmpty().WithMessage("GroupId is required");
            RuleFor(x => x.VehicleId).NotEmpty().WithMessage("VehicleId is required");
            RuleFor(x => x.CostType).IsInEnum().WithMessage("Invalid cost type");
            RuleFor(x => x.Title).NotEmpty().MaximumLength(200).WithMessage("Title is required and must not exceed 200 characters");
            RuleFor(x => x.TotalAmount).GreaterThan(0).WithMessage("TotalAmount must be greater than 0");
            RuleFor(x => x.Currency).NotEmpty().Length(3).WithMessage("Currency must be 3 characters");
            RuleFor(x => x.DueDate).GreaterThan(DateTime.UtcNow).WithMessage("DueDate must be in the future");
            RuleFor(x => x.CostShareDetails).NotEmpty().WithMessage("CostShareDetails is required");
            RuleForEach(x => x.CostShareDetails).SetValidator(new CreateCostShareDetailValidator());
        }
    }

    public class CreateCostShareDetailValidator : AbstractValidator<CreateCostShareDetailDto>
    {
        public CreateCostShareDetailValidator()
        {
            RuleFor(x => x.UserId).NotEmpty().WithMessage("UserId is required");
            RuleFor(x => x.OwnershipPercentage).GreaterThan(0).LessThanOrEqualTo(100)
                .WithMessage("OwnershipPercentage must be between 0 and 100");
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Amount must be greater than 0");
        }
    }

    public class CreatePaymentValidator : AbstractValidator<CreatePaymentDto>
    {
        public CreatePaymentValidator()
        {
            RuleFor(x => x.CostShareDetailId).NotEmpty().WithMessage("CostShareDetailId is required");
            // WalletId removed - wallet management is now handled separately
            RuleFor(x => x.Method).IsInEnum().WithMessage("Invalid payment method");
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Amount must be greater than 0");
            RuleFor(x => x.Currency).NotEmpty().Length(3).WithMessage("Currency must be 3 characters");
        }
    }

    public class CreatePaymentMethodValidator : AbstractValidator<CreatePaymentMethodDto>
    {
        public CreatePaymentMethodValidator()
        {
            RuleFor(x => x.UserId).NotEmpty().WithMessage("UserId is required");
            RuleFor(x => x.MethodType).NotEmpty().MaximumLength(50).WithMessage("MethodType is required and must not exceed 50 characters");
            RuleFor(x => x.AccountNumber).NotEmpty().MaximumLength(200).WithMessage("AccountNumber is required and must not exceed 200 characters");
        }
    }
}
