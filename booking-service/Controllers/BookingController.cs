using BookingService.DTOs;
using BookingService.Services;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _service;

    public BookingsController(IBookingService service)
    {
        _service = service;
    }

    //Hiển thị lịch
    [HttpGet("schedules")]
    public async Task<ActionResult<IEnumerable<VehicleScheduleResponse>>> GetSchedules() =>
        Ok(await _service.GetVehicleSchedulesAsync());

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BookingResponse>>> GetAll() =>
        Ok(await _service.GetAllBookingsAsync());

    [HttpPost]
    public async Task<ActionResult<BookingResponse>> Create(CreateBookingRequest request)
    {
        var result = await _service.CreateBookingAsync(request);
        if (result == null) return BadRequest("Cannot create booking.");
        return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<BookingResponse>> Update(int id, UpdateBookingRequest request)
    {
        var result = await _service.UpdateBookingAsync(id, request);
        if (result == null) return BadRequest("Cannot update booking.");
        return Ok(result);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<BookingResponse>> UpdateStatus(int id, [FromBody] UpdateBookingStatusRequest request)
    {
        var result = await _service.UpdateBookingStatusAsync(id, request.Status);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(int id)
    {
        var success = await _service.CancelBookingAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    
}
